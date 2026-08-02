import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Generate embedding for a given text using text-embedding-004 (768 dimensions)
 * @param {string} text
 * @returns {Promise<number[]>} 768-dimensional float array
 */
export const generateEmbedding = async (text) => {
  if (!genAI) {
    throw new Error('Gemini API key is not configured (GEMINI_API_KEY).');
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    if (!result?.embedding?.values) {
      throw new Error('No embedding values returned from Gemini API');
    }
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error.message);
    throw error;
  }
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
    console.error('Error in Gemini generateCompletion:', error.message);
    throw error;
  }
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
    console.error('Error in Gemini generateJSON:', error.message);
    throw error;
  }
};

/**
 * Generate embeddings for a batch of texts using text-embedding-004 in a single API call
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

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.batchEmbedContents({
      requests: texts.map((t) => ({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: t }] }
      }))
    });

    if (!result?.embeddings) {
      throw new Error('No embeddings returned from Gemini API batch request');
    }

    return result.embeddings.map((e) => e.values);
  } catch (error) {
    console.error('Error generating batch embeddings with Gemini:', error.message);
    throw error;
  }
};

export default {
  generateEmbedding,
  generateEmbeddingsBatch,
  generateCompletion,
  generateJSON
};
