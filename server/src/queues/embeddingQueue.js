import { Queue } from 'bullmq';
import { bullMQConnection } from '../config/redis.js';

const QUEUE_NAME = 'embeddingQueue_v2';

// Initialize the BullMQ queue
export const embeddingQueue = new Queue(QUEUE_NAME, bullMQConnection);

embeddingQueue.on('error', (err) => {
  console.error('[Embedding Queue] Error:', err.message);
});

/**
 * Add a document processing job to the queue.
 * @param {number} documentId Database document ID
 * @param {string} filePath Local path to the PDF
 * @returns {Promise<object>} BullMQ job object
 */
export const addDocumentJob = async (documentId, filePath) => {
  return await embeddingQueue.add(
    'process-document',
    { documentId, filePath },
    {
      attempts: 3,
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
  embeddingQueue,
  addDocumentJob,
};
