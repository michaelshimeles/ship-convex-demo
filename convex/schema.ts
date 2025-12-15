import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { Infer } from 'convex/values'

export const vState = v.union(
  v.literal('requested'),
  v.literal('waiting'),
  v.literal('scheduled'),
  v.literal('inProgress'),
  v.literal('cancelled'),
  v.literal('completed'),
)

export type ItemState = Infer<typeof vState>

export const vDueDateType = v.union(
  v.literal('week'),
  v.literal('month'),
  v.literal('quarter'),
)

export const vDueDate = v.optional(
  v.object({
    type: vDueDateType,
    year: v.number(),
    which: v.number(),
  }),
)

export type DueDate = Infer<typeof vDueDate>

const vProductRelease = v.object({
  product: v.string(),
  version: v.number(),
  items: v.array(v.id('items')),
})

export type ProductRelease = Infer<typeof vProductRelease>

const vRandomImprovement = v.object({
  itemId: v.id('items'),
})

export type RandomImprovement = Infer<typeof vRandomImprovement>

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatarImage: v.string(),
    identifier: v.string(),
    role: v.union(v.literal('admin'), v.literal('user')),
    chips: v.optional(v.number()), // Optional for existing users, defaults to 100 in code
  }).index('by_identifier', ['identifier']),
  items: defineTable({
    number: v.number(),
    title: v.string(),
    description: v.string(),
    completed: v.boolean(),
    state: vState,
    dueDate: vDueDate,
    completedAt: v.optional(v.number()),
    createdBy: v.optional(v.id('users')), // Optional for existing items created before chip economy
  })
    .index('by_state', ['state'])
    .index('by_number', ['number'])
    .index('by_completed_at', ['completedAt']),
  events: defineTable({
    author: v.id('users'),
    title: v.optional(v.string()),
    slug: v.string(),
    comment: v.optional(v.string()),
    stamp: v.number(),
    type: v.union(v.literal('productRelease'), v.literal('randomImprovement')),
    event: v.union(vProductRelease, vRandomImprovement),
  })
    .index('by_slug', ['slug'])
    .index('by_stamp', ['stamp']),
  devLogMessages: defineTable({
    item: v.id('items'),
    author: v.id('users'),
    stamp: v.number(),
    message: v.string(),
  }).index('by_item', ['item']),
  bids: defineTable({
    itemId: v.id('items'),
    userId: v.id('users'),
    amount: v.number(),
  })
    .index('by_item', ['itemId'])
    .index('by_user', ['userId'])
    .index('by_item_and_user', ['itemId', 'userId']),
  coefficients: defineTable({
    who: v.id('users'),
    value: v.number(),
  }).index('by_who', ['who']),
  cancellations: defineTable({
    itemId: v.id('items'),
    admin: v.id('users'),
    why: v.string(),
    stamp: v.number(),
  }).index('by_item', ['itemId']),
})
