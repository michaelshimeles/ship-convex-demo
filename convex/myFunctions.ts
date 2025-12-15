import { query } from './_generated/server';
import { v } from 'convex/values';

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const getUser = query({
  args: {},
  returns: v.union(
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      pictureUrl: v.optional(v.string()),
      chips: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get user from database to include chips
    const user = await ctx.db
      .query('users')
      .withIndex('by_identifier', (q) => q.eq('identifier', identity.subject))
      .unique();

    return {
      name: identity.name ?? identity.nickname ?? identity.email?.split('@')[0],
      email: identity.email,
      pictureUrl: identity.pictureUrl,
      chips: user?.chips ?? 100, // Default to 100 for existing users without chips
    };
  },
});

