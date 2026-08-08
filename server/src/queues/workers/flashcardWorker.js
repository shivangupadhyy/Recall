import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { chunks, flashcards } from '../../config/schema.js';
import { bullMQConnection } from '../../config/redis.js';
import geminiService from '../../services/geminiService.js';

const worker = new Worker(
  'flashcardQueue_v2',
  async (job) => {
    const { documentId, userId } = job.data;
    console.log(`[Flashcard Worker] Started generating flashcards for document ID: ${documentId}`);

    try {
      // 1. Fetch chunks for the document ordered by index
      const documentChunks = await db
        .select()
        .from(chunks)
        .where(eq(chunks.documentId, documentId))
        .orderBy(chunks.chunkIndex);

      if (documentChunks.length === 0) {
        throw new Error(`No text chunks found for document ID ${documentId}. Cannot generate flashcards.`);
      }

      // Limit enqueued context size if document is too large (~15k tokens limit or max 40 chunks)
      // to keep response times fast and context clean.
      const selectedChunks = documentChunks.slice(0, 40);
      const contextText = selectedChunks
        .map(c => `[Page ${c.pageNumber}] ${c.text}`)
        .join('\n\n');

      // 2. Formulate structured prompt
      const prompt = `Generate a set of 15 high-quality flashcards based on the following study materials context. Focus on key definitions, concepts, formulas, and questions that are likely to be tested in exams.

Study Materials Context:
---
${contextText}
---

Your response MUST be a JSON array containing exactly 15 flashcard objects.
Each object in the array MUST have the following structure:
{
  "front": "Clear question, term, or prompt here...",
  "back": "Concise answer, explanation, or definition here..."
}`;

      console.log(`[Flashcard Worker] Querying Gemini for structured JSON flashcards...`);
      const generatedCards = await geminiService.generateJSON(prompt);
      
      if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
        throw new Error('Gemini failed to return a valid JSON array of flashcards.');
      }

      console.log(`[Flashcard Worker] Successfully generated ${generatedCards.length} flashcards.`);

      // 3. Attach Leitner spaced-repetition metadata to each card
      const cardsWithMetadata = generatedCards.map((card, idx) => ({
        id: idx + 1, // Add simple unique ID within this deck
        front: card.front,
        back: card.back,
        box: 1, // Leitner box starts at 1
        lastReviewed: null,
        nextReviewDate: null
      }));

      // 4. Save to database (idempotent: delete existing flashcard deck if retried)
      await db.delete(flashcards).where(eq(flashcards.documentId, documentId));
      await db.insert(flashcards).values({
        documentId,
        userId,
        cards: JSON.stringify(cardsWithMetadata),
        updatedAt: new Date()
      });

      console.log(`[Flashcard Worker] Successfully saved flashcards to database for document ID: ${documentId}`);
    } catch (error) {
      console.error(`[Flashcard Worker] Failed generating flashcards for document ID ${documentId}:`, error.message);
      throw error;
    }
  },
  bullMQConnection
);

worker.on('failed', (job, err) => {
  console.error(`[Flashcard Worker] Job ${job?.id} failed with error:`, err.message);
});

export default worker;
