import { query } from './_generated/server';
import { v } from 'convex/values';
import { authKit } from './users';

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const getUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      name: v.string(),
      email: v.string(),
      pictureUrl: v.string(),
      chips: v.number(),
      role: v.union(v.literal('admin'), v.literal('user')),
      subject: v.string(),
      issuer: v.optional(v.string()),
      emailVerified: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const authUser = await authKit.getAuthUser(ctx);

    if (!authUser || !identity) {
      return null;
    }

    // Get user from database - this has the actual stored data
    const dbUser = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', authUser.id))
      .unique();

    if (!dbUser) {
      return null;
    }

    return {
      _id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      pictureUrl: dbUser.avatarImage,
      chips: dbUser.chips ?? 100,
      role: dbUser.role,
      // Identity fields for profile display
      subject: identity.subject,
      issuer: identity.issuer,
      emailVerified: identity.emailVerified,
    };
  },
});

