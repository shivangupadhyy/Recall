import { Queue } from 'bullmq';
import { bullMQConnection } from '../config/redis.js';

const QUEUE_NAME = 'flashcardQueue_v2';

// Initialize the BullMQ queue for flashcards
export const flashcardQueue = new Queue(QUEUE_NAME, bullMQConnection);

flashcardQueue.on('error', (err) => {
  console.error('[Flashcard Queue] Error:', err.message);
});

/**
 * Add a flashcard generation job to the queue.
 * @param {number} documentId Database document ID
 * @param {number} userId User ID requesting the flashcards
 * @returns {Promise<object>} BullMQ job object
 */
export const addFlashcardJob = async (documentId, userId) => {
  return await flashcardQueue.add(
    'generate-flashcards',
    { documentId, userId },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

export default {
  flashcardQueue,
  addFlashcardJob,
};
