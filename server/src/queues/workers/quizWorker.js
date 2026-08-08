import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { chunks, quizzes } from '../../config/schema.js';
import { bullMQConnection } from '../../config/redis.js';
import geminiService from '../../services/geminiService.js';

const worker = new Worker(
  'quizQueue_v2',
  async (job) => {
    const { documentId, userId } = job.data;
    console.log(`[Quiz Worker] Started generating quiz for document ID: ${documentId}`);

    try {
      // 1. Fetch chunks for the document ordered by index
      const documentChunks = await db
        .select()
        .from(chunks)
        .where(eq(chunks.documentId, documentId))
        .orderBy(chunks.chunkIndex);

      if (documentChunks.length === 0) {
        throw new Error(`No text chunks found for document ID ${documentId}. Cannot generate quiz.`);
      }

      // Limit enqueued context size if document is too large (~15k tokens limit or max 40 chunks)
      // to keep response times fast and context clean.
      const selectedChunks = documentChunks.slice(0, 40);
      const contextText = selectedChunks
        .map(c => `[Page ${c.pageNumber}] ${c.text}`)
        .join('\n\n');

      // 2. Formulate structured prompt
      const prompt = `Generate a set of 10 Multiple Choice Questions (MCQs) based on the following study materials context.

Study Materials Context:
---
${contextText}
---

Your response MUST be a JSON array containing exactly 10 questions.
Each question object MUST have the following structure:
{
  "question": "The question text here...",
  "options": [
    "Option A text",
    "Option B text",
    "Option C text",
    "Option D text"
  ],
  "correctAnswerIndex": 0, // 0-indexed number indicating the index of the correct option (0, 1, 2, or 3)
  "explanation": "A short explanation of why this answer is correct..."
}`;

      console.log(`[Quiz Worker] Querying Gemini for structured JSON questions...`);
      const questions = await geminiService.generateJSON(prompt);
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Gemini failed to return a valid JSON array of questions.');
      }

      console.log(`[Quiz Worker] Successfully generated ${questions.length} questions.`);

      // 3. Save to database (idempotent: delete existing quiz if retried)
      await db.delete(quizzes).where(eq(quizzes.documentId, documentId));
      await db.insert(quizzes).values({
        documentId,
        userId,
        questions: JSON.stringify(questions),
        updatedAt: new Date()
      });

      console.log(`[Quiz Worker] Successfully saved quiz to database for document ID: ${documentId}`);
    } catch (error) {
      console.error(`[Quiz Worker] Failed generating quiz for document ID ${documentId}:`, error.message);
      throw error;
    }
  },
  bullMQConnection
);

worker.on('failed', (job, err) => {
  console.error(`[Quiz Worker] Job ${job?.id} failed with error:`, err.message);
});

export default worker;
