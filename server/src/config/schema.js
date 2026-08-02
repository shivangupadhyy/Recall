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
