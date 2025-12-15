import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { paginationOptsValidator } from 'convex/server'

const vProductRelease = v.object({
  product: v.string(),
  version: v.number(),
  items: v.array(v.id('items')),
})

const vRandomImprovement = v.object({
  itemId: v.id('items'),
})

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
 * Create a product release event (admin only)
 */
export const createProductRelease = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    comment: v.optional(v.string()),
    product: v.string(),
    version: v.number(),
    itemIds: v.array(v.id('items')),
  },
  returns: v.id('events'),
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx)

    // Check for duplicate slug
    const existingEvent = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existingEvent) {
      throw new Error('An event with this slug already exists')
    }

    // Verify all items exist
    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId)
      if (!item) {
        throw new Error(`Item ${itemId} not found`)
      }
    }

    return await ctx.db.insert('events', {
      author: user._id,
      title: args.title,
      slug: args.slug,
      comment: args.comment,
      stamp: Date.now(),
      type: 'productRelease' as const,
      event: {
        product: args.product,
        version: args.version,
        items: args.itemIds,
      },
    })
  },
})

/**
 * Create a random improvement event (admin only)
 */
export const createRandomImprovement = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    comment: v.optional(v.string()),
    itemId: v.id('items'),
  },
  returns: v.id('events'),
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx)

    // Check for duplicate slug
    const existingEvent = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existingEvent) {
      throw new Error('An event with this slug already exists')
    }

    // Verify item exists
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    return await ctx.db.insert('events', {
      author: user._id,
      title: args.title,
      slug: args.slug,
      comment: args.comment,
      stamp: Date.now(),
      type: 'randomImprovement' as const,
      event: {
        itemId: args.itemId,
      },
    })
  },
})

/**
 * List events ordered by stamp (most recent first), paginated
 */
export const listEvents = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .withIndex('by_stamp')
      .order('desc')
      .paginate(args.paginationOpts)
  },
})

/**
 * Get all events (non-paginated, for simple lists)
 */
export const getAllEvents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('events'),
      _creationTime: v.number(),
      title: v.optional(v.string()),
      slug: v.string(),
      comment: v.optional(v.string()),
      stamp: v.number(),
      type: v.union(v.literal('productRelease'), v.literal('randomImprovement')),
      author: v.object({
        _id: v.id('users'),
        name: v.string(),
        avatarImage: v.string(),
      }),
    }),
  ),
  handler: async (ctx) => {
    const events = await ctx.db.query('events').withIndex('by_stamp').order('desc').collect()

    const result: Array<{
      _id: Id<'events'>
      _creationTime: number
      title?: string
      slug: string
      comment?: string
      stamp: number
      type: 'productRelease' | 'randomImprovement'
      author: { _id: Id<'users'>; name: string; avatarImage: string }
    }> = []

    for (const event of events) {
      const author = await ctx.db.get(event.author)
      if (author) {
        result.push({
          _id: event._id,
          _creationTime: event._creationTime,
          title: event.title,
          slug: event.slug,
          comment: event.comment,
          stamp: event.stamp,
          type: event.type,
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
 * Get a single event by slug
 */
export const getEventBySlug = query({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('events'),
      _creationTime: v.number(),
      title: v.optional(v.string()),
      slug: v.string(),
      comment: v.optional(v.string()),
      stamp: v.number(),
      type: v.union(v.literal('productRelease'), v.literal('randomImprovement')),
      author: v.object({
        _id: v.id('users'),
        name: v.string(),
        avatarImage: v.string(),
      }),
      items: v.array(
        v.object({
          _id: v.id('items'),
          number: v.number(),
          title: v.string(),
          description: v.string(),
        }),
      ),
      productInfo: v.optional(
        v.object({
          product: v.string(),
          version: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!event) {
      return null
    }

    const author = await ctx.db.get(event.author)
    if (!author) {
      return null
    }

    // Get items based on event type
    const items: Array<{
      _id: Id<'items'>
      number: number
      title: string
      description: string
    }> = []

    if (event.type === 'productRelease') {
      const releaseEvent = event.event as { product: string; version: number; items: Id<'items'>[] }
      for (const itemId of releaseEvent.items) {
        const item = await ctx.db.get(itemId)
        if (item) {
          items.push({
            _id: item._id,
            number: item.number,
            title: item.title,
            description: item.description,
          })
        }
      }

      return {
        _id: event._id,
        _creationTime: event._creationTime,
        title: event.title,
        slug: event.slug,
        comment: event.comment,
        stamp: event.stamp,
        type: event.type,
        author: {
          _id: author._id,
          name: author.name,
          avatarImage: author.avatarImage,
        },
        items,
        productInfo: {
          product: releaseEvent.product,
          version: releaseEvent.version,
        },
      }
    } else {
      const improvementEvent = event.event as { itemId: Id<'items'> }
      const item = await ctx.db.get(improvementEvent.itemId)
      if (item) {
        items.push({
          _id: item._id,
          number: item.number,
          title: item.title,
          description: item.description,
        })
      }

      return {
        _id: event._id,
        _creationTime: event._creationTime,
        title: event.title,
        slug: event.slug,
        comment: event.comment,
        stamp: event.stamp,
        type: event.type,
        author: {
          _id: author._id,
          name: author.name,
          avatarImage: author.avatarImage,
        },
        items,
        productInfo: undefined,
      }
    }
  },
})

/**
 * Get event count for dashboard
 */
export const getEventCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const events = await ctx.db.query('events').collect()
    return events.length
  },
})

