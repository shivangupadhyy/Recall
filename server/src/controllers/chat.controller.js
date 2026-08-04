import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { documents, chunks, chatHistories } from '../config/schema.js';
import geminiService from '../services/geminiService.js';

/**
 * @desc    Get chat history for a document
 * @route   GET /api/chat/:docId
 * @access  Private
 */
export const getChatHistory = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    const userId = req.user.id;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Verify document belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    // Get chat history record
    const [historyRecord] = await db
      .select()
      .from(chatHistories)
      .where(and(eq(chatHistories.documentId, docId), eq(chatHistories.userId, userId)))
      .limit(1);

    const messages = historyRecord ? JSON.parse(historyRecord.messages) : [];

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error.message);
    res.status(500).json({ error: 'Server error retrieving chat history' });
  }
};

/**
 * @desc    Send a message (question) about a document and get RAG response
 * @route   POST /api/chat/:docId
 * @access  Private
 */
export const sendMessage = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    const userId = req.user.id;
    const { message } = req.body;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Please provide a question' });
    }

    // 1. Verify document belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    // 2. Generate embedding for user's query
    console.log(`[RAG Chat] Embedding query: "${message}"`);
    const queryEmbedding = await geminiService.generateEmbedding(message);

    // 3. Query pgvector using Drizzle for top 5 most similar chunks
    console.log(`[RAG Chat] Executing vector similarity search for doc ID ${docId}...`);
    const similarityChunks = await db
      .select({
        id: chunks.id,
        text: chunks.text,
        pageNumber: chunks.pageNumber,
        chunkIndex: chunks.chunkIndex,
        similarity: sql`1 - (${chunks.embedding} <=> ${`[${queryEmbedding.join(',')}]`})`
      })
      .from(chunks)
      .where(eq(chunks.documentId, docId))
      .orderBy(sql`${chunks.embedding} <=> ${`[${queryEmbedding.join(',')}]`}`)
      .limit(5);

    console.log(`[RAG Chat] Found ${similarityChunks.length} matching context chunks.`);

    // 4. Construct prompt and system instructions
    const contextText = similarityChunks
      .map(c => `[Page ${c.pageNumber}] ${c.text}`)
      .join('\n\n');

    const systemInstruction = `You are "Abhyaas AI", a helpful study assistant. You answer student questions based ONLY on the uploaded study materials provided in the CONTEXT.

Follow these strict rules:
1. Grounding: Answer the question using ONLY the facts and information directly mentioned in the CONTEXT. If the context does not contain the answer, say exactly: "I cannot find the answer to this question in your uploaded notes." Do not make up answers, do not use external training data to answer.
2. Citation: Always cite the source pages of your answers. When referencing information from a chunk, append a superscript or brackets citation showing the page number, e.g. [Page X].
3. Format: Structure your response cleanly. Use bullet points or small paragraphs to make it readable.
4. Language: Answer in the same language as the notes (usually English). Keep the tone encouraging, clear, and academic.`;

    const userPrompt = `CONTEXT FROM UPLOADED NOTES:
---
${contextText}
---

QUESTION:
${message}`;

    // 5. Get conversation history from database
    const [historyRecord] = await db
      .select()
      .from(chatHistories)
      .where(and(eq(chatHistories.documentId, docId), eq(chatHistories.userId, userId)))
      .limit(1);

    let messageHistory = historyRecord ? JSON.parse(historyRecord.messages) : [];

    // Filter history for the Gemini API call: only pass role and content to avoid sending local metadata
    const apiHistory = messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 6. Call Gemini
    console.log('[RAG Chat] Requesting Gemini response...');
    const aiAnswer = await geminiService.generateChatResponse(apiHistory, userPrompt, systemInstruction);
    console.log('[RAG Chat] Received Gemini response.');

    // 7. Update chat history record
    const newUserMessage = {
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };

    const newAIMessage = {
      role: 'assistant',
      content: aiAnswer,
      sourceChunks: similarityChunks.map(c => ({
        pageNumber: c.pageNumber,
        text: c.text
      })),
      createdAt: new Date().toISOString()
    };

    messageHistory.push(newUserMessage);
    messageHistory.push(newAIMessage);

    if (historyRecord) {
      await db
        .update(chatHistories)
        .set({
          messages: JSON.stringify(messageHistory),
          updatedAt: new Date()
        })
        .where(eq(chatHistories.id, historyRecord.id));
    } else {
      await db
        .insert(chatHistories)
        .values({
          documentId: docId,
          userId,
          messages: JSON.stringify(messageHistory)
        });
    }

    res.status(200).json({ 
      answer: aiAnswer, 
      sourceChunks: newAIMessage.sourceChunks 
    });
  } catch (error) {
    console.error('Error in sendMessage:', error.message);
    res.status(500).json({ error: error.message || 'Server error generating response' });
  }
};

/**
 * @desc    Clear chat history for a document
 * @route   DELETE /api/chat/:docId
 * @access  Private
 */
export const clearChatHistory = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    const userId = req.user.id;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Verify document belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    // Delete history record
    await db
      .delete(chatHistories)
      .where(and(eq(chatHistories.documentId, docId), eq(chatHistories.userId, userId)));

    res.status(200).json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing chat history:', error.message);
    res.status(500).json({ error: 'Server error clearing chat history' });
  }
};
