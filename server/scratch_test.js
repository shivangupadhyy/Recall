import dotenv from 'dotenv';
dotenv.config();

import pdfExtractor from './src/services/pdfExtractor.js';
import chunker from './src/services/chunker.js';
import geminiService from './src/services/geminiService.js';
import path from 'path';

async function run() {
  try {
    const pdfPath = path.resolve('uploads/1785673533734-71009437.pdf');
    console.log('PDF Path:', pdfPath);
    
    console.log('Step 1: Extracting text...');
    const rawText = await pdfExtractor.extractTextWithPageMarkers(pdfPath);
    console.log('Raw text extracted successfully. Length:', rawText.length);
    console.log('Sample raw text:', rawText.substring(0, 500));
    
    console.log('Step 2: Chunking...');
    const textChunks = chunker.createChunks(rawText);
    console.log('Generated chunks count:', textChunks.length);
    if (textChunks.length > 0) {
      console.log('Sample chunk:', textChunks[0]);
    } else {
      console.log('No chunks generated!');
      return;
    }
    
    console.log('Step 3: Generating embedding for first chunk...');
    const firstChunkText = textChunks[0].text;
    const embedding = await geminiService.generateEmbedding(firstChunkText);
    console.log('Single embedding generated successfully. Dimension:', embedding.length);
    
    console.log('Step 4: Batch embeddings...');
    const textsToEmbed = textChunks.slice(0, 5).map(c => c.text);
    const batchEmbeddings = await geminiService.generateEmbeddingsBatch(textsToEmbed);
    console.log('Batch embeddings generated successfully. Count:', batchEmbeddings.length);
  } catch (err) {
    console.error('Error during run:', err);
  }
}

run();
