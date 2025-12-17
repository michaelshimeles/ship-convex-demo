import { internalMutation, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { QueryCtx, MutationCtx } from './_generated/server'

/**
 * AuthKit helper for WorkOS integration
 * Extracts user data from the authenticated identity
 */
export const authKit = {
  async getAuthUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return {
      id: identity.subject,
      email: identity.email ?? '',
      name: identity.name ?? identity.nickname ?? identity.email?.split('@')[0] ?? 'User',
      avatarImage:
        identity.pictureUrl ??
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          identity.name ?? identity.email ?? 'User'
        )}`,
    }
  },
}

/**
 * Sync the current authenticated user to the database
 * Call this after authentication to ensure user data is stored
 * Accepts user profile data from WorkOS session (which has email, name, etc.)
 */
export const syncCurrentUser = mutation({
  args: {
    // User profile from WorkOS session (has the actual user data)
    profile: v.optional(v.object({
      id: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
      profilePictureUrl: v.union(v.string(), v.null()),
    })),
  },
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx, args) => {
    // First verify the user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    // Use profile from args (from WorkOS session) or fall back to identity
    const userId = args.profile?.id ?? identity.subject
    const email = args.profile?.email ?? identity.email ?? ''
    const firstName = args.profile?.firstName ?? null
    const lastName = args.profile?.lastName ?? null
    const joinedName = [firstName, lastName].filter(Boolean).join(' ')
    const name = joinedName || 
                 (identity.name ?? identity.nickname ?? email.split('@')[0]) || 
                 'User'
    const avatarImage = args.profile?.profilePictureUrl ?? 
                        identity.pictureUrl ?? 
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`

    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', userId))
      .unique()

    if (existingUser) {
      // Update with real values from profile
      const updates: Partial<{
        email: string
        name: string
        avatarImage: string
      }> = {}

      // Update email if we have a real one
      if (email && email.length > 0) {
        updates.email = email
      }

      // Update name if we have a real one
      if (name && name !== 'User') {
        updates.name = name
      }

      // Update avatar if we have a real one (not dicebear)
      if (avatarImage && !avatarImage.includes('dicebear.com')) {
        updates.avatarImage = avatarImage
      }

      // Only patch if we have real updates
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id, updates)
      }

      return existingUser._id
    }

    // Create new user with default role and 100 chips
    return await ctx.db.insert('users', {
      identifier: userId,
      email: email,
      name: name,
      avatarImage: avatarImage,
      role: 'user',
      chips: 100,
    })
  },
})

/**
 * Sync a user from WorkOS webhook
 * Creates a new user or updates an existing one
 */
export const syncUser = internalMutation({
  args: {
    identifier: v.string(),
    email: v.string(),
    name: v.string(),
    avatarImage: v.string(),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', args.identifier))
      .unique()

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatarImage: args.avatarImage,
      })
      return existingUser._id
    }

    // Create new user with default role and 100 chips
    return await ctx.db.insert('users', {
      identifier: args.identifier,
      email: args.email,
      name: args.name,
      avatarImage: args.avatarImage,
      role: 'user',
      chips: 100,
    })
  },
})

/**
 * Get user by their identifier (WorkOS user ID)
 */
export const getUserByIdentifier = query({
  args: {
    identifier: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      email: v.string(),
      name: v.string(),
      avatarImage: v.string(),
      role: v.union(v.literal('admin'), v.literal('user')),
      chips: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', args.identifier))
      .unique()

    if (!user) return null

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      avatarImage: user.avatarImage,
      role: user.role,
      chips: user.chips ?? 100, // Default to 100 for existing users without chips
    }
  },
})

/**
 * Get current user from auth context
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authKit.getAuthUser(ctx)

    console.log("authUser", authUser);
    if (!authUser) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', authUser.id))
      .unique()

    return user
  },
})

