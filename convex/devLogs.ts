import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
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
 * Add a dev log message to an item (admin only)
 */
export const addMessage = mutation({
  args: {
    itemId: v.id('items'),
    message: v.string(),
  },
  returns: v.id('devLogMessages'),
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx)

    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    return await ctx.db.insert('devLogMessages', {
      item: args.itemId,
      author: user._id,
      stamp: Date.now(),
      message: args.message,
    })
  },
})

/**
 * List messages for an item, ordered by timestamp
 */
export const listMessages = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.array(
    v.object({
      _id: v.id('devLogMessages'),
      stamp: v.number(),
      message: v.string(),
      author: v.object({
        _id: v.id('users'),
        name: v.string(),
        avatarImage: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('devLogMessages')
      .withIndex('by_item', (q) => q.eq('item', args.itemId))
      .collect()

    // Sort by stamp ascending (oldest first)
    messages.sort((a, b) => a.stamp - b.stamp)

    const result: Array<{
      _id: Id<'devLogMessages'>
      stamp: number
      message: string
      author: { _id: Id<'users'>; name: string; avatarImage: string }
    }> = []

    for (const msg of messages) {
      const author = await ctx.db.get(msg.author)
      if (author) {
        result.push({
          _id: msg._id,
          stamp: msg.stamp,
          message: msg.message,
          author: {
            _id: author._id,
            name: author.name,
            avatarImage: author.avatarImage,
          },
        })
      }
    }

    return result
  },
})

/**
 * Get recent dev log activity across all items
 */
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('devLogMessages'),
      stamp: v.number(),
      message: v.string(),
      author: v.object({
        _id: v.id('users'),
        name: v.string(),
        avatarImage: v.string(),
      }),
      item: v.object({
        _id: v.id('items'),
        number: v.number(),
        title: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    const messages = await ctx.db.query('devLogMessages').order('desc').take(limit)

    const result: Array<{
      _id: Id<'devLogMessages'>
      stamp: number
      message: string
      author: { _id: Id<'users'>; name: string; avatarImage: string }
      item: { _id: Id<'items'>; number: number; title: string }
    }> = []

    for (const msg of messages) {
      const author = await ctx.db.get(msg.author)
      const item = await ctx.db.get(msg.item)

      if (author && item) {
        result.push({
          _id: msg._id,
          stamp: msg.stamp,
          message: msg.message,
          author: {
            _id: author._id,
            name: author.name,
            avatarImage: author.avatarImage,
          },
          item: {
            _id: item._id,
            number: item.number,
            title: item.title,
          },
        })
      }
    }

    return result
  },
})

