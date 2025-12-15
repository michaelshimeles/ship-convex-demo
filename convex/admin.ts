import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

/**
 * Helper to check if current user is admin
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
 * Cancel an item with a reason (admin only)
 */
export const cancelItem = mutation({
  args: {
    itemId: v.id('items'),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)

    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    if (item.state === 'cancelled' || item.state === 'completed') {
      throw new Error('Item is already in a terminal state')
    }

    // Update item state
    await ctx.db.patch(args.itemId, { state: 'cancelled' as const })

    // Record cancellation
    await ctx.db.insert('cancellations', {
      itemId: args.itemId,
      admin: admin._id,
      why: args.reason,
      stamp: Date.now(),
    })

    return null
  },
})

/**
 * Get cancellation info for an item
 */
export const getCancellation = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      _id: v.id('cancellations'),
      why: v.string(),
      stamp: v.number(),
      admin: v.object({
        _id: v.id('users'),
        name: v.string(),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const cancellation = await ctx.db
      .query('cancellations')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .unique()

    if (!cancellation) {
      return null
    }

    const admin = await ctx.db.get(cancellation.admin)
    if (!admin) {
      return null
    }

    return {
      _id: cancellation._id,
      why: cancellation.why,
      stamp: cancellation.stamp,
      admin: {
        _id: admin._id,
        name: admin.name,
      },
    }
  },
})

/**
 * Set a user's bid coefficient (admin only)
 */
export const setCoefficient = mutation({
  args: {
    userId: v.id('users'),
    value: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if coefficient exists
    const existing = await ctx.db
      .query('coefficients')
      .withIndex('by_who', (q) => q.eq('who', args.userId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value })
    } else {
      await ctx.db.insert('coefficients', {
        who: args.userId,
        value: args.value,
      })
    }

    return null
  },
})

/**
 * List all users with their coefficients (admin only)
 */
export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('users'),
      email: v.string(),
      name: v.string(),
      avatarImage: v.string(),
      role: v.union(v.literal('admin'), v.literal('user')),
      coefficient: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    if (!currentUser || currentUser.role !== 'admin') {
      return []
    }

    const users = await ctx.db.query('users').collect()

    const result: Array<{
      _id: Id<'users'>
      email: string
      name: string
      avatarImage: string
      role: 'admin' | 'user'
      coefficient: number
    }> = []

    for (const user of users) {
      const coefficient = await ctx.db
        .query('coefficients')
        .withIndex('by_who', (q) => q.eq('who', user._id))
        .unique()

      result.push({
        _id: user._id,
        email: user.email,
        name: user.name,
        avatarImage: user.avatarImage,
        role: user.role,
        coefficient: coefficient?.value ?? 1,
      })
    }

    return result
  },
})

/**
 * Get user count for dashboard
 */
export const getUserCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.length
  },
})

/**
 * Check if current user is admin
 */
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return false
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique()

    return user?.role === 'admin'
  },
})

/**
 * Set a user's role (admin only)
 */
export const setUserRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('user')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)

    // Prevent self-demotion
    if (admin._id === args.userId && args.role === 'user') {
      throw new Error('Cannot demote yourself')
    }

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    await ctx.db.patch(args.userId, { role: args.role })
    return null
  },
})

