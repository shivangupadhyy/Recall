import { pgTable, serial, text, varchar, integer, timestamp, customType } from 'drizzle-orm/pg-core';

// Custom pgvector type for Drizzle (uses base 'vector' type without dimensions to support pgvector v0.5.0+)
export const vector = customType({
  dataType: () => 'vector',
  toDriver: (value) => {
    if (Array.isArray(value)) {
      return `[${value.join(',')}]`;
    }
    return value;
  },
  fromDriver: (value) => {
    if (typeof value === 'string') {
      return value.slice(1, -1).split(',').map(Number);
    }
    return value;
  }
});

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  college: varchar('college', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Documents Table
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  status: varchar('status', { length: 50 }).default('processing').notNull(), // 'processing' | 'ready' | 'failed'
  totalChunks: integer('total_chunks').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chunks Table
export const chunks = pgTable('chunks', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  embedding: vector('embedding').notNull(), // PostgreSQL resolves to vector type natively
  pageNumber: integer('page_number').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Quizzes Table
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  questions: text('questions').notNull(), // Stringified JSON questions
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Flashcards Table
export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cards: text('cards').notNull(), // Stringified JSON cards
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ChatHistories Table
export const chatHistories = pgTable('chat_histories', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  messages: text('messages').notNull(), // Stringified JSON chat history
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// UserStats Table
export const userStats = pgTable('user_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  streak: integer('streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastStudyDate: timestamp('last_study_date'),
  studyTime: integer('study_time').default(0).notNull(), // cumulative in seconds
  dailyGoalXp: integer('daily_goal_xp').default(100).notNull(),
  weeklyGoalXp: integer('weekly_goal_xp').default(500).notNull(),
  monthlyGoalXp: integer('monthly_goal_xp').default(2000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// UserActivities Table
export const userActivities = pgTable('user_activities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  activityType: varchar('activity_type', { length: 100 }).notNull(), // 'quiz_completed' | 'flashcards_reviewed' | 'document_uploaded' | 'chat_message_sent'
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'cascade' }), // nullable
  score: integer('score'), // nullable (for quiz)
  totalQuestions: integer('total_questions'), // nullable (for quiz)
  xpEarned: integer('xp_earned').default(0).notNull(),
  duration: integer('duration').default(0).notNull(), // in seconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// UserAchievements Table
export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementId: varchar('achievement_id', { length: 100 }).notNull(), // 'first_upload' | 'first_quiz' | 'first_flashcards' | 'streak_3' | 'streak_7' | 'perfectionist'
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

