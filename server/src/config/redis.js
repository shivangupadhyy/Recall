import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Reconnect every 5 seconds, max 5 retries to prevent spamming
      if (retries > 5) {
        console.warn('Redis: Reconnection attempts exceeded. Continuing without Redis services.');
        return false; // stops reconnecting
      }
      return 5000;
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis connection warning:', err.message);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

// Connection configuration string/object for BullMQ workers and queues
const isSecure = redisUrl.startsWith('rediss://');
export const bullMQConnection = {
  connection: {
    url: redisUrl,
    maxRetriesPerRequest: null,
    ...(isSecure ? {
      tls: {
        rejectUnauthorized: false
      }
    } : {})
  }
};

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis: Failed to initialize client connection.', err.message);
  }
};

export default redisClient;
