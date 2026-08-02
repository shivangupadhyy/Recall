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
  'embeddingQueue',
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

        // Insert chunks with their embeddings into Postgres using Drizzle
        const insertPromises = batch.map((chunk, index) => {
          return db.insert(chunks).values({
            documentId: doc.id,
            userId: doc.userId,
            text: chunk.text,
            embedding: embeddings[index],
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex
          });
        });

        // Run insertions in parallel for this batch
        await Promise.all(insertPromises);
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
    } catch (error) {
      console.error(`[Worker] Failed processing document ID ${doc.id}:`, error.message);
      
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

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Global worker error:', err.message);
});

export default worker;
