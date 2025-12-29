import { pgTable, uuid, varchar, timestamp, decimal, integer, boolean, jsonb, date, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (Stores Whop Creator Info)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  whopUserId: varchar('whop_user_id', { length: 255 }).unique().notNull(),
  whopCompanyId: varchar('whop_company_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  username: varchar('username', { length: 255 }),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('free'), // free, pro, enterprise
  subscriptionStatus: varchar('subscription_status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastSyncAt: timestamp('last_sync_at'),
  settings: jsonb('settings').default({}),
});

// Members table (Cached Member Data)
export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  whopMemberId: varchar('whop_member_id', { length: 255 }).notNull(),
  whopMembershipId: varchar('whop_membership_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 50 }), // active, cancelled, expired, etc.
  joinedAt: timestamp('joined_at'),
  cancelledAt: timestamp('cancelled_at'),
  productId: varchar('product_id', { length: 255 }),
  planId: varchar('plan_id', { length: 255 }),
  renewalPrice: decimal('renewal_price', { precision: 10, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('usd'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('idx_members_user_id').on(table.userId),
  };
});

// Engagement Metrics (Daily Snapshots) - Optimized for Partitioning
export const engagementMetrics = pgTable('engagement_metrics', {
  id: uuid('id').defaultRandom(), // Optional if using composite PK, but good for Drizzle
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  messageCount: integer('message_count').default(0),
  activityScore: integer('activity_score').default(0), // Previously login_count
  courseProgressDelta: decimal('course_progress_delta', { precision: 5, scale: 2 }).default('0'),
  lastActiveAt: timestamp('last_active_at'),
  engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }), // 0-100
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    // Composite Primary Key for Partitioning Support
    pk: primaryKey({ columns: [table.memberId, table.date] }),
    userIdDateIdx: index('idx_engagement_metrics_user_id_date').on(table.userId, table.date),
  };
});

// Revenue Metrics (Daily Snapshots)
export const revenueMetrics = pgTable('revenue_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  mrr: decimal('mrr', { precision: 12, scale: 2 }).default('0'),
  arr: decimal('arr', { precision: 12, scale: 2 }).default('0'),
  newMrr: decimal('new_mrr', { precision: 12, scale: 2 }).default('0'),
  churnedMrr: decimal('churned_mrr', { precision: 12, scale: 2 }).default('0'),
  expansionMrr: decimal('expansion_mrr', { precision: 12, scale: 2 }).default('0'),
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  totalMembers: integer('total_members').default(0),
  activeMembers: integer('active_members').default(0),
  churnedMembers: integer('churned_members').default(0),
  newMembers: integer('new_members').default(0),
  churnRate: decimal('churn_rate', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    uniqueUserDate: index('idx_revenue_metrics_user_id_date_unique').on(table.userId, table.date),
  };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  members: many(members),
  engagementMetrics: many(engagementMetrics),
  revenueMetrics: many(revenueMetrics),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  engagementMetrics: many(engagementMetrics),
}));

export const engagementMetricsRelations = relations(engagementMetrics, ({ one }) => ({
  user: one(users, {
    fields: [engagementMetrics.userId],
    references: [users.id],
  }),
  member: one(members, {
    fields: [engagementMetrics.memberId],
    references: [members.id],
  }),
}));

export const revenueMetricsRelations = relations(revenueMetrics, ({ one }) => ({
  user: one(users, {
    fields: [revenueMetrics.userId],
    references: [users.id],
  }),
}));
