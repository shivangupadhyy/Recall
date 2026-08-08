import { Worker } from 'bullmq';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { documents, chunks } from '../../config/schema.js';
import { bullMQConnection } from '../../config/redis.js';
import pdfExtractor from '../../services/pdfExtractor.js';
import chunker from '../../services/chunker.js';
import geminiService from '../../services/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRootDir = path.resolve(__dirname, '../../../');

const worker = new Worker(
  'embeddingQueue_v2',
  async (job) => {
    const { documentId } = job.data;
    console.log(`[Worker] Started processing document ID: ${documentId}`);

    // Fetch document from database
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc) {
      throw new Error(`Document with ID ${documentId} not found in database.`);
    }

    try {
      // 1. Resolve local PDF file path
      const filename = doc.fileUrl.replace('/uploads/', '');
      const absolutePath = path.join(serverRootDir, 'uploads', filename);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`PDF file not found on disk at: ${absolutePath}`);
      }

      // 2. Extract text with page markers
      console.log(`[Worker] Extracting text from PDF: ${filename}`);
      const rawText = await pdfExtractor.extractTextWithPageMarkers(absolutePath);

      // 3. Create text chunks
      console.log(`[Worker] Chunking extracted text...`);
      const textChunks = chunker.createChunks(rawText);
      console.log(`[Worker] Generated ${textChunks.length} chunks.`);

      if (textChunks.length === 0) {
        throw new Error('No readable text chunks extracted from PDF.');
      }

      // Delete any existing chunks for this document to make the worker idempotent on retries
      await db.delete(chunks).where(eq(chunks.documentId, doc.id));

      // 4. Generate embeddings in batches and save chunks to database
      const BATCH_SIZE = 30;
      for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
        const batch = textChunks.slice(i, i + BATCH_SIZE);
        console.log(`[Worker] Generating embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(textChunks.length / BATCH_SIZE)} (chunks ${i + 1}-${Math.min(i + BATCH_SIZE, textChunks.length)})`);
        
        const textsToEmbed = batch.map(chunk => chunk.text);
        const embeddings = await geminiService.generateEmbeddingsBatch(textsToEmbed);

        // Insert chunks with their embeddings into Postgres using Drizzle batch insert
        const insertValues = batch.map((chunk, index) => ({
          documentId: doc.id,
          userId: doc.userId,
          text: chunk.text,
          embedding: embeddings[index],
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex
        }));
        await db.insert(chunks).values(insertValues);
      }

      // 5. Update document status to ready
      await db.update(documents)
        .set({
          status: 'ready',
          totalChunks: textChunks.length,
          updatedAt: new Date()
        })
        .where(eq(documents.id, doc.id));

      console.log(`[Worker] Successfully completed processing document ID: ${doc.id}`);
      try {
        const fs = await import('fs');
        const logFile = path.resolve(serverRootDir, 'diagnostic.log');
        const logText = `${new Date().toISOString()} - [Worker Success] Successfully completed processing document ID: ${doc.id}\n`;
        fs.appendFileSync(logFile, logText);
      } catch (logErr) {
        // ignore
      }
    } catch (error) {
      console.error(`[Worker] Failed processing document ID ${doc.id}:`, error.message);
      
      // Log failure detail to diagnostic.log
      try {
        const fs = await import('fs');
        const logFile = path.resolve(serverRootDir, 'diagnostic.log');
        const logText = `${new Date().toISOString()} - [Worker Process Error] Document ${doc.id} failed: ${error.message}\nStack: ${error.stack}\n`;
        fs.appendFileSync(logFile, logText);
      } catch (logErr) {
        console.error('Failed to write worker error to diagnostic log file:', logErr.message);
      }

      // Update document status to failed
      await db.update(documents)
        .set({
          status: 'failed',
          updatedAt: new Date()
        })
        .where(eq(documents.id, doc.id));

      throw error; // Propagate error for BullMQ retry
    }
  },
  bullMQConnection
);

worker.on('failed', async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  try {
    const fs = await import('fs');
    const logFile = path.resolve(serverRootDir, 'diagnostic.log');
    const logText = `${new Date().toISOString()} - [Worker Job Failed] Job ${job?.id} failed: ${err.message}\nStack: ${err.stack}\n`;
    fs.appendFileSync(logFile, logText);
  } catch (logErr) {
    // ignore
  }
});

worker.on('error', async (err) => {
  console.error('[Worker] Global worker error:', err.message);
  try {
    const fs = await import('fs');
    const logFile = path.resolve(serverRootDir, 'diagnostic.log');
    const logText = `${new Date().toISOString()} - [Worker Global Error]: ${err.message}\nStack: ${err.stack}\n`;
    fs.appendFileSync(logFile, logText);
  } catch (logErr) {
    // ignore
  }
});

export default worker;
