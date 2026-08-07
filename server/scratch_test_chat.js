import dotenv from 'dotenv';
dotenv.config();

import { eq, and, sql } from 'drizzle-orm';
import { db } from './src/config/db.js';
import { chunks } from './src/config/schema.js';
import geminiService from './src/services/geminiService.js';

async function run() {
  try {
    const documentId = 7;
    const testQuery = 'What is DBMS?';
    console.log(`Step 1: Embedding query: "${testQuery}"`);
    const queryEmbedding = await geminiService.generateEmbedding(testQuery);
    console.log(`Generated embedding size: ${queryEmbedding.length}`);

    console.log('\nStep 2: Performing pgvector similarity search on chunks...');
    const similarityChunks = await db
      .select({
        id: chunks.id,
        text: chunks.text,
        pageNumber: chunks.pageNumber,
        chunkIndex: chunks.chunkIndex,
        similarity: sql`1 - (${chunks.embedding} <=> ${`[${queryEmbedding.join(',')}]`})`
      })
      .from(chunks)
      .where(eq(chunks.documentId, documentId))
      .orderBy(sql`${chunks.embedding} <=> ${`[${queryEmbedding.join(',')}]`}`)
      .limit(5);

    console.log(`Found similarity chunks count: ${similarityChunks.length}`);
    similarityChunks.forEach((c, index) => {
      console.log(`[${index + 1}] Similarity: ${c.similarity.toFixed(4)}, Page: ${c.pageNumber}`);
      console.log(`Snippet: "${c.text.substring(0, 150)}..."\n`);
    });

    console.log('\nStep 3: Constructing RAG prompt and calling Gemini...');
    const contextText = similarityChunks
      .map(c => `[Page ${c.pageNumber}] ${c.text}`)
      .join('\n\n');

    const systemInstruction = `You are "Recall AI", a helpful study assistant. You answer student questions based ONLY on the uploaded study materials provided in the CONTEXT.

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
${testQuery}`;

    const answer = await geminiService.generateChatResponse([], userPrompt, systemInstruction);
    console.log('\n--- Recall AI Response ---');
    console.log(answer);
    console.log('---------------------------');
  } catch (err) {
    console.error('Error running test script:', err);
  }
}

run();
