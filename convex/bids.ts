import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

// Minimum chips required to place a bid
const MIN_BID_CHIPS = 2

/**
 * Place or update a bid on an item (costs chips)
 */
export const placeBid = mutation({
  args: {
    itemId: v.id('items'),
    amount: v.number(),
  },
  returns: v.id('bids'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Validate minimum bid amount
    if (args.amount < MIN_BID_CHIPS) {
      throw new Error(`Minimum bid is ${MIN_BID_CHIPS} chips`)
    }

    // Get the user from the database
    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if item exists
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    // Check if item is open for bidding
    if (item.state === 'completed' || item.state === 'cancelled') {
      throw new Error('This item is no longer open for bidding')
    }

    const userChips = user.chips ?? 100 // Default to 100 for existing users without chips

    // Check if bid already exists
    const existingBid = await ctx.db
      .query('bids')
      .withIndex('by_item_and_user', (q) => q.eq('itemId', args.itemId).eq('userId', user._id))
      .unique()

    if (existingBid) {
      // Update existing bid - calculate the difference
      const difference = args.amount - existingBid.amount

      if (difference > 0) {
        // Increasing bid - need to deduct more chips
        if (userChips < difference) {
          throw new Error(`Not enough chips. You need ${difference} more chips to increase your bid.`)
        }
        await ctx.db.patch(user._id, { chips: userChips - difference })
      } else if (difference < 0) {
        // Decreasing bid - refund the difference
        // But ensure we don't go below minimum
        if (args.amount < MIN_BID_CHIPS) {
          throw new Error(`Minimum bid is ${MIN_BID_CHIPS} chips. Use "Remove bid" to withdraw completely.`)
        }
        await ctx.db.patch(user._id, { chips: userChips + Math.abs(difference) })
      }
      // If difference is 0, no chip change needed

      await ctx.db.patch(existingBid._id, { amount: args.amount })
      return existingBid._id
    }

    // New bid - check if user has enough chips
    if (userChips < args.amount) {
      throw new Error(`Not enough chips. You need ${args.amount} chips to place this bid, but you only have ${userChips}.`)
    }

    // Deduct chips from user
    await ctx.db.patch(user._id, { chips: userChips - args.amount })

    // Create new bid
    return await ctx.db.insert('bids', {
      itemId: args.itemId,
      userId: user._id,
      amount: args.amount,
    })
  },
})

/**
 * Remove a bid from an item (refunds chips)
 */
export const removeBid = mutation({
  args: {
    itemId: v.id('items'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    const bid = await ctx.db
      .query('bids')
      .withIndex('by_item_and_user', (q) => q.eq('itemId', args.itemId).eq('userId', user._id))
      .unique()

    if (bid) {
      // Refund the bid amount to the user
      const userChips = user.chips ?? 100
      await ctx.db.patch(user._id, { chips: userChips + bid.amount })

      // Delete the bid
      await ctx.db.delete(bid._id)
    }

    return null
  },
})

/**
 * Get all bids for an item with user info
 */
export const getItemBids = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.array(
    v.object({
      _id: v.id('bids'),
      amount: v.number(),
      user: v.object({
        _id: v.id('users'),
        name: v.string(),
        avatarImage: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query('bids')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()

    const result: Array<{
      _id: Id<'bids'>
      amount: number
      user: { _id: Id<'users'>; name: string; avatarImage: string }
    }> = []

    for (const bid of bids) {
      const user = await ctx.db.get(bid.userId)
      if (user) {
        result.push({
          _id: bid._id,
          amount: bid.amount,
          user: {
            _id: user._id,
            name: user.name,
            avatarImage: user.avatarImage,
          },
        })
      }
    }

    return result
  },
})

/**
 * Get all bids by current user
 */
export const getUserBids = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('bids'),
      amount: v.number(),
      item: v.object({
        _id: v.id('items'),
        number: v.number(),
        title: v.string(),
        state: v.string(),
      }),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    if (!user) {
      return []
    }

    const bids = await ctx.db
      .query('bids')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const result: Array<{
      _id: Id<'bids'>
      amount: number
      item: { _id: Id<'items'>; number: number; title: string; state: string }
    }> = []

    for (const bid of bids) {
      const item = await ctx.db.get(bid.itemId)
      if (item) {
        result.push({
          _id: bid._id,
          amount: bid.amount,
          item: {
            _id: item._id,
            number: item.number,
            title: item.title,
            state: item.state,
          },
        })
      }
    }

    return result
  },
})

/**
 * Get current user's bid on an item
 */
export const getUserBidForItem = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      _id: v.id('bids'),
      amount: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    if (!user) {
      return null
    }

    const bid = await ctx.db
      .query('bids')
      .withIndex('by_item_and_user', (q) => q.eq('itemId', args.itemId).eq('userId', user._id))
      .unique()

    if (!bid) {
      return null
    }

    return {
      _id: bid._id,
      amount: bid.amount,
    }
  },
})

/**
 * Calculate weighted priority for an item
 * Priority = sum of (bid amount * user coefficient)
 */
export const getItemPriority = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query('bids')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()

    let priority = 0

    for (const bid of bids) {
      // Get user's coefficient (default to 1 if not set)
      const coefficient = await ctx.db
        .query('coefficients')
        .withIndex('by_who', (q) => q.eq('who', bid.userId))
        .unique()

      const multiplier = coefficient?.value ?? 1
      priority += bid.amount * multiplier
    }

    return priority
  },
})

/**
 * Get user's portfolio stats for profile page
 */
export const getPortfolioStats = query({
  args: {},
  returns: v.object({
    balance: v.number(),
    totalInvested: v.number(),
    activeBids: v.array(
      v.object({
        _id: v.id('bids'),
        amount: v.number(),
        item: v.object({
          _id: v.id('items'),
          number: v.number(),
          title: v.string(),
          state: v.string(),
        }),
      }),
    ),
    completedBids: v.array(
      v.object({
        _id: v.id('bids'),
        amount: v.number(),
        item: v.object({
          _id: v.id('items'),
          number: v.number(),
          title: v.string(),
          completedAt: v.optional(v.number()),
        }),
      }),
    ),
    cancelledBids: v.array(
      v.object({
        _id: v.id('bids'),
        amount: v.number(),
        item: v.object({
          _id: v.id('items'),
          number: v.number(),
          title: v.string(),
        }),
      }),
    ),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return {
        balance: 0,
        totalInvested: 0,
        activeBids: [],
        completedBids: [],
        cancelledBids: [],
      }
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    if (!user) {
      return {
        balance: 0,
        totalInvested: 0,
        activeBids: [],
        completedBids: [],
        cancelledBids: [],
      }
    }

    const bids = await ctx.db
      .query('bids')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const activeBids: Array<{
      _id: Id<'bids'>
      amount: number
      item: { _id: Id<'items'>; number: number; title: string; state: string }
    }> = []

    const completedBids: Array<{
      _id: Id<'bids'>
      amount: number
      item: { _id: Id<'items'>; number: number; title: string; completedAt?: number }
    }> = []

    const cancelledBids: Array<{
      _id: Id<'bids'>
      amount: number
      item: { _id: Id<'items'>; number: number; title: string }
    }> = []

    let totalInvested = 0

    for (const bid of bids) {
      const item = await ctx.db.get(bid.itemId)
      if (!item) continue

      if (item.state === 'completed') {
        completedBids.push({
          _id: bid._id,
          amount: bid.amount,
          item: {
            _id: item._id,
            number: item.number,
            title: item.title,
            completedAt: item.completedAt,
          },
        })
      } else if (item.state === 'cancelled') {
        cancelledBids.push({
          _id: bid._id,
          amount: bid.amount,
          item: {
            _id: item._id,
            number: item.number,
            title: item.title,
          },
        })
      } else {
        activeBids.push({
          _id: bid._id,
          amount: bid.amount,
          item: {
            _id: item._id,
            number: item.number,
            title: item.title,
            state: item.state,
          },
        })
        totalInvested += bid.amount
      }
    }

    // Sort by amount descending
    activeBids.sort((a, b) => b.amount - a.amount)
    completedBids.sort((a, b) => (b.item.completedAt ?? 0) - (a.item.completedAt ?? 0))

    return {
      balance: user.chips ?? 100,
      totalInvested,
      activeBids,
      completedBids,
      cancelledBids,
    }
  },
})

/**
 * Get items sorted by priority
 */
export const getItemsByPriority = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('items'),
      number: v.number(),
      title: v.string(),
      state: v.string(),
      priority: v.number(),
      bidCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const items = await ctx.db.query('items').collect()

    const itemsWithPriority: Array<{
      _id: Id<'items'>
      number: number
      title: string
      state: string
      priority: number
      bidCount: number
    }> = []

    for (const item of items) {
      const bids = await ctx.db
        .query('bids')
        .withIndex('by_item', (q) => q.eq('itemId', item._id))
        .collect()

      let priority = 0
      for (const bid of bids) {
        const coefficient = await ctx.db
          .query('coefficients')
          .withIndex('by_who', (q) => q.eq('who', bid.userId))
          .unique()
        const multiplier = coefficient?.value ?? 1
        priority += bid.amount * multiplier
      }

      itemsWithPriority.push({
        _id: item._id,
        number: item.number,
        title: item.title,
        state: item.state,
        priority,
        bidCount: bids.length,
      })
    }

    // Sort by priority descending
    itemsWithPriority.sort((a, b) => b.priority - a.priority)

    return itemsWithPriority
  },
})

