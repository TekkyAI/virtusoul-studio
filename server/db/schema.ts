import { pgTable, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const id = (prefix: string) =>
  text('id').primaryKey().$defaultFn(() => `${prefix}${crypto.randomUUID().replace(/-/g, '')}`)

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}

// ── Users ──────────────────────────────────────────────
export const users = pgTable('users', {
  id: id('usr_'),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  ...timestamps,
})

// ── Folders ────────────────────────────────────────────
export const folders = pgTable('folders', {
  id: id('fld_'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
})

// ── Conversations ──────────────────────────────────────
export const conversations = pgTable('conversations', {
  id: id('conv_'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Chat'),
  agentId: text('agent_id'),
  sessionKey: text('session_key'),
  model: text('model'),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  pinned: boolean('pinned').default(false),
  archived: boolean('archived').default(false),
  ...timestamps,
}, (t) => [
  index('conv_user_idx').on(t.userId),
  index('conv_updated_idx').on(t.updatedAt),
])

// ── Messages ───────────────────────────────────────────
export const messages = pgTable('messages', {
  id: id('msg_'),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull().default(''),
  blocks: jsonb('blocks').$type<unknown[]>().default([]),
  runId: text('run_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  generationTimeMs: integer('generation_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('msg_conv_idx').on(t.conversationId),
])

// ── Bookmarks ──────────────────────────────────────────
export const bookmarks = pgTable('bookmarks', {
  id: id('bm_'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  selectedText: text('selected_text'),
  note: text('note'),
  ...timestamps,
})

// ── Selection Queries ──────────────────────────────────
export const selectionQueries = pgTable('selection_queries', {
  id: id('sel_'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  selectedText: text('selected_text').notNull(),
  action: text('action').notNull(), // 'explain' | 'simplify' | 'deep_dive' | 'translate'
  response: text('response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Preferences ────────────────────────────────────────
export const preferences = pgTable('preferences', {
  id: id('pref_'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value'),
}, (t) => [
  index('pref_user_key_idx').on(t.userId, t.key),
])

// ── Activity Logs ──────────────────────────────────────
export const activityLogs = pgTable('activity_logs', {
  id: id('al_'),
  userId: text('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: jsonb('details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('al_created_idx').on(t.createdAt),
])

// ── Traces (Observability) ─────────────────────────────
export const traces = pgTable('traces', {
  id: id('tr_'),
  traceType: text('trace_type').notNull(), // 'api' | 'ws' | 'cli'
  method: text('method'),
  path: text('path'),
  status: integer('status'),
  durationMs: integer('duration_ms'),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('tr_created_idx').on(t.createdAt),
  index('tr_type_idx').on(t.traceType),
])

// ── Memory Nodes (Graph Memory) ────────────────────────
export const memoryNodes = pgTable('memory_nodes', {
  id: id('mn_'),
  content: text('content').notNull(),
  memoryType: text('memory_type').notNull(), // Fact, Preference, Decision, Identity, Event, Observation, Goal, Todo
  importance: integer('importance').default(5),
  sourceFile: text('source_file'),
  ...timestamps,
}, (t) => [
  index('mn_type_idx').on(t.memoryType),
])

// ── Memory Edges (Graph Memory) ────────────────────────
export const memoryEdges = pgTable('memory_edges', {
  id: id('me_'),
  fromId: text('from_id').notNull().references(() => memoryNodes.id, { onDelete: 'cascade' }),
  toId: text('to_id').notNull().references(() => memoryNodes.id, { onDelete: 'cascade' }),
  relation: text('relation').notNull(), // RelatedTo, Updates, Contradicts, CausedBy, PartOf
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
