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

      // 4. Generate embeddings and save chunks to database
      for (const chunk of textChunks) {
        console.log(`[Worker] Generating embedding for chunk ${chunk.chunkIndex + 1}/${textChunks.length} (Page ${chunk.pageNumber})`);
        
        // Generate embedding vector using Gemini
        const embedding = await geminiService.generateEmbedding(chunk.text);

        // Insert chunk into Postgres using Drizzle
        await db.insert(chunks).values({
          documentId: doc.id,
          userId: doc.userId,
          text: chunk.text,
          embedding,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex
        });
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
