import { Queue } from 'bullmq';
import { bullMQConnection } from '../config/redis.js';

const QUEUE_NAME = 'quizQueue';

// Initialize the BullMQ queue for quizzes
export const quizQueue = new Queue(QUEUE_NAME, bullMQConnection);

/**
 * Add a quiz generation job to the queue.
 * @param {number} documentId Database document ID
 * @param {number} userId User ID requesting the quiz
 * @returns {Promise<object>} BullMQ job object
 */
export const addQuizJob = async (documentId, userId) => {
  return await quizQueue.add(
    'generate-quiz',
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
  quizQueue,
  addQuizJob,
};
