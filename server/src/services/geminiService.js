import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Helper to retry a function if a transient error (503, 429, 500) is encountered.
 * Uses exponential backoff.
 */
const retryWithBackoff = async (fn, retries = 3, delayMs = 1500) => {
  try {
    return await fn();
  } catch (error) {
    const errorMsg = error.message || '';
    const status = error.status;
    
    const isTransient = 
      errorMsg.includes('503') || 
      errorMsg.includes('500') || 
      errorMsg.includes('429') || 
      errorMsg.includes('Too Many Requests') ||
      errorMsg.includes('Service Unavailable') ||
      status === 503 || 
      status === 429 || 
      status === 500;

    if (retries > 0 && isTransient) {
      console.warn(`[Gemini API] Transient error encountered: "${errorMsg}". Retrying in ${delayMs}ms... (Remaining retries: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
};

/**
 * Generate embedding for a given text using text-embedding-004 (falling back to gemini-embedding-001)
 * @param {string} text
 * @returns {Promise<number[]>} 768-dimensional float array
 */
export const generateEmbedding = async (text) => {
  if (!genAI) {
    throw new Error('Gemini API key is not configured (GEMINI_API_KEY).');
  }
  
  return retryWithBackoff(async () => {
    try {
      // Primary attempt using the newer text-embedding-004 model
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768
      });
      if (!result?.embedding?.values) {
        throw new Error('No embedding values returned from Gemini API');
      }
      return result.embedding.values;
    } catch (error) {
      // Fallback: if text-embedding-004 fails or is unavailable, use gemini-embedding-001
      console.warn(`[Gemini Service] text-embedding-004 failed, falling back to gemini-embedding-001: ${error.message}`);
      const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await model.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768
      });
      if (!result?.embedding?.values) {
        throw new Error('No embedding values returned from Gemini API fallback model');
      }
      return result.embedding.values;
    }
  });
};

/**
 * Generate a text completion with gemini-2.5-flash
 * @param {string} prompt
 * @param {string} systemInstruction
 * @returns {Promise<string>} Model output text
 */
export const generateCompletion = async (prompt, systemInstruction = '') => {
  if (!genAI) {
    throw new Error('Gemini API key is not configured (GEMINI_API_KEY).');
  }

  return retryWithBackoff(async () => {
    try {
      const modelOptions = { model: 'gemini-2.5-flash' };
      if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
      }
      
      const model = genAI.getGenerativeModel(modelOptions);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in Gemini generateCompletion action:', error.message);
      throw error;
    }
  });
};

/**
 * Generate a structured JSON response
 * @param {string} prompt
 * @param {string} systemInstruction
 * @returns {Promise<any>} Parsed JSON output object/array
 */
export const generateJSON = async (prompt, systemInstruction = '') => {
  if (!genAI) {
    throw new Error('Gemini API key is not configured (GEMINI_API_KEY).');
  }

  return retryWithBackoff(async () => {
    try {
      const modelOptions = { 
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json'
        }
      };
      if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
      }

      const model = genAI.getGenerativeModel(modelOptions);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('Error in Gemini generateJSON action:', error.message);
      throw error;
    }
  });
};

/**
 * Generate embeddings for a batch of texts using text-embedding-004 (falling back to gemini-embedding-001)
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of 768-dimensional float arrays
 */
export const generateEmbeddingsBatch = async (texts) => {
  if (!genAI) {
    throw new Error('Gemini API key is not configured (GEMINI_API_KEY).');
  }
  if (!texts || texts.length === 0) {
    return [];
  }

  return retryWithBackoff(async () => {
    try {
      // Primary batch embedding using text-embedding-004
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.batchEmbedContents({
        requests: texts.map((t) => ({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: t }] },
          outputDimensionality: 768
        }))
      });

      if (!result?.embeddings) {
        throw new Error('No embeddings returned from Gemini API batch request');
      }

      return result.embeddings.map((e) => e.values);
    } catch (error) {
      // Fallback: if text-embedding-004 fails, try gemini-embedding-001
      console.warn(`[Gemini Service] Batch text-embedding-004 failed, falling back to gemini-embedding-001: ${error.message}`);
      const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await model.batchEmbedContents({
        requests: texts.map((t) => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: t }] },
          outputDimensionality: 768
        }))
      });

      if (!result?.embeddings) {
        throw new Error('No embeddings returned from Gemini API fallback batch request');
      }

      return result.embeddings.map((e) => e.values);
    }
  });
};

/**
 * Generate a text response based on conversation history and a prompt (multi-turn conversation)
 * @param {Array<{role: string, content: string}>} history - Previous messages
 * @param {string} newPrompt - The latest user prompt containing RAG context
 * @param {string} systemInstruction - The system grounding instructions
 * @returns {Promise<string>} Model output text
 */
export const generateChatResponse = async (history, newPrompt, systemInstruction = '') => {
  if (!genAI) {
    throw new Error('Gemini API key is not configured (GEMINI_API_KEY).');
  }

  return retryWithBackoff(async () => {
    try {
      const modelOptions = { model: 'gemini-2.5-flash' };
      if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
      }
      
      const model = genAI.getGenerativeModel(modelOptions);

      // Map conversation history to Gemini role format (user / model)
      const contents = [
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: newPrompt }]
        }
      ];

      const result = await model.generateContent({ contents });
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in Gemini generateChatResponse action:', error.message);
      throw error;
    }
  });
};

export default {
  generateEmbedding,
  generateEmbeddingsBatch,
  generateCompletion,
  generateJSON,
  generateChatResponse
};
