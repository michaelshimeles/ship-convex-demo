import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { vState, vDueDate } from './schema'
import { Id } from './_generated/dataModel'

/**
 * Helper to require admin access
 */
async function requireAdmin(ctx: { auth: any; db: any }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_identifier', (q: any) => q.eq('identifier', identity.subject))
    .unique()

  if (!user) {
    throw new Error('User not found')
  }

  if (user.role !== 'admin') {
    throw new Error('Admin access required')
  }

  return user
}

/**
 * List all items, optionally filtered by state
 */
export const listItems = query({
  args: {
    state: v.optional(vState),
  },
  returns: v.array(
    v.object({
      _id: v.id('items'),
      _creationTime: v.number(),
      number: v.number(),
      title: v.string(),
      description: v.string(),
      completed: v.boolean(),
      state: vState,
      dueDate: vDueDate,
      completedAt: v.optional(v.number()),
      createdBy: v.optional(v.id('users')),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.state) {
      return await ctx.db
        .query('items')
        .withIndex('by_state', (q) => q.eq('state', args.state!))
        .collect()
    }
    return await ctx.db.query('items').collect()
  },
})

/**
 * Get a single item by ID
 */
export const getItem = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      _id: v.id('items'),
      _creationTime: v.number(),
      number: v.number(),
      title: v.string(),
      description: v.string(),
      completed: v.boolean(),
      state: vState,
      dueDate: vDueDate,
      completedAt: v.optional(v.number()),
      createdBy: v.optional(v.id('users')),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId)
  },
})

/**
 * Get the next item number (auto-increment)
 */
async function getNextItemNumber(ctx: { db: any }): Promise<number> {
  const lastItem = await ctx.db.query('items').withIndex('by_number').order('desc').first()
  return lastItem ? lastItem.number + 1 : 1
}

// Cost in chips to create a new item
const ITEM_CREATION_COST = 20

/**
 * Create a new item (costs 20 chips)
 */
export const createItem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  returns: v.id('items'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the user from the database
    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q: any) => q.eq('identifier', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user has enough chips
    const userChips = user.chips ?? 100 // Default to 100 for existing users without chips
    if (userChips < ITEM_CREATION_COST) {
      throw new Error(`Not enough chips. You need ${ITEM_CREATION_COST} chips to create an item, but you only have ${userChips}.`)
    }

    // Deduct chips from user
    await ctx.db.patch(user._id, {
      chips: userChips - ITEM_CREATION_COST,
    })

    const number = await getNextItemNumber(ctx)

    const itemId = await ctx.db.insert('items', {
      number,
      title: args.title,
      description: args.description,
      completed: false,
      state: 'requested' as const,
      dueDate: undefined,
      createdBy: user._id,
    })

    // Automatically place a bid for the creator (their creation cost becomes their investment)
    await ctx.db.insert('bids', {
      itemId,
      userId: user._id,
      amount: ITEM_CREATION_COST,
    })

    return itemId
  },
})

/**
 * Update an existing item (admin only)
 */
export const updateItem = mutation({
  args: {
    itemId: v.id('items'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: vDueDate,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    const updates: Record<string, unknown> = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate

    await ctx.db.patch(args.itemId, updates)
    return null
  },
})

// Valid state transitions
const validTransitions: Record<string, string[]> = {
  requested: ['waiting', 'cancelled'],
  waiting: ['scheduled', 'cancelled'],
  scheduled: ['inProgress', 'cancelled'],
  inProgress: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
}

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string, number: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
  return `item-${number}-${baseSlug}`
}

// Reward multipliers for chip economy
const CREATOR_COMPLETION_MULTIPLIER = 2 // Creator gets 2x return (40 chips for 20 spent)
const VOTER_COMPLETION_MULTIPLIER = 1.5 // Voters get 1.5x return

/**
 * Transition an item to a new state (admin only)
 */
export const transitionState = mutation({
  args: {
    itemId: v.id('items'),
    newState: vState,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)

    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    const allowedStates = validTransitions[item.state] || []
    if (!allowedStates.includes(args.newState)) {
      throw new Error(`Cannot transition from ${item.state} to ${args.newState}`)
    }

    const updates: { state: typeof args.newState; completed?: boolean; completedAt?: number } = {
      state: args.newState,
    }

    const completedAt = Date.now()

    // Get all bids for this item (needed for both completion and cancellation)
    const bids = await ctx.db
      .query('bids')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()

    if (args.newState === 'completed') {
      updates.completed = true
      updates.completedAt = completedAt

      // Reward the creator with 2x return (40 chips) - only if createdBy exists (new items)
      if (item.createdBy) {
        const creator = await ctx.db.get(item.createdBy)
        if (creator) {
          const creatorChips = creator.chips ?? 100
          const creatorReward = ITEM_CREATION_COST * CREATOR_COMPLETION_MULTIPLIER
          await ctx.db.patch(creator._id, { chips: creatorChips + creatorReward })
        }
      }

      // Reward all voters with 1.5x return
      for (const bid of bids) {
        const voter = await ctx.db.get(bid.userId)
        if (voter) {
          const voterChips = voter.chips ?? 100
          const voterReward = Math.floor(bid.amount * VOTER_COMPLETION_MULTIPLIER)
          await ctx.db.patch(voter._id, { chips: voterChips + voterReward })
        }
      }

      // Auto-create changelog event for completed item
      const baseSlug = generateSlug(item.title, item.number)
      
      // Ensure slug is unique by checking and adding suffix if needed
      let slug = baseSlug
      let suffix = 0
      while (true) {
        const existingEvent = await ctx.db
          .query('events')
          .withIndex('by_slug', (q) => q.eq('slug', slug))
          .unique()
        if (!existingEvent) break
        suffix++
        slug = `${baseSlug}-${suffix}`
      }

      // Create the changelog event
      await ctx.db.insert('events', {
        author: admin._id,
        title: item.title,
        slug,
        comment: item.description,
        stamp: completedAt,
        type: 'randomImprovement' as const,
        event: {
          itemId: args.itemId,
        },
      })
    }

    if (args.newState === 'cancelled') {
      // Refund the creator their 20 chips - only if createdBy exists (new items)
      if (item.createdBy) {
        const creator = await ctx.db.get(item.createdBy)
        if (creator) {
          const creatorChips = creator.chips ?? 100
          await ctx.db.patch(creator._id, { chips: creatorChips + ITEM_CREATION_COST })
        }
      }

      // Refund all voters their full bid amounts
      for (const bid of bids) {
        const voter = await ctx.db.get(bid.userId)
        if (voter) {
          const voterChips = voter.chips ?? 100
          await ctx.db.patch(voter._id, { chips: voterChips + bid.amount })
        }
      }
    }

    await ctx.db.patch(args.itemId, updates)
    return null
  },
})

/**
 * Get item counts by state for dashboard
 */
export const getItemCounts = query({
  args: {},
  returns: v.object({
    total: v.number(),
    requested: v.number(),
    waiting: v.number(),
    scheduled: v.number(),
    inProgress: v.number(),
    completed: v.number(),
    cancelled: v.number(),
  }),
  handler: async (ctx) => {
    const items = await ctx.db.query('items').collect()

    const counts = {
      total: items.length,
      requested: 0,
      waiting: 0,
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    }

    for (const item of items) {
      counts[item.state]++
    }

    return counts
  },
})

/**
 * Delete an item and all related data (admin only)
 */
export const deleteItem = mutation({
  args: {
    itemId: v.id('items'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    // Delete related bids
    const bids = await ctx.db
      .query('bids')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()
    for (const bid of bids) {
      await ctx.db.delete(bid._id)
    }

    // Delete related dev log messages
    const messages = await ctx.db
      .query('devLogMessages')
      .withIndex('by_item', (q) => q.eq('item', args.itemId))
      .collect()
    for (const msg of messages) {
      await ctx.db.delete(msg._id)
    }

    // Delete related cancellations
    const cancellations = await ctx.db
      .query('cancellations')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()
    for (const cancellation of cancellations) {
      await ctx.db.delete(cancellation._id)
    }

    // Delete the item itself
    await ctx.db.delete(args.itemId)

    return null
  },
})

