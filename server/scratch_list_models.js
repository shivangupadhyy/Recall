import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';

const apiKey = process.env.GEMINI_API_KEY;

async function run() {
  try {
    console.log('Fetching available models using fetch...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return;
    }

    console.log('Available models:');
    const embeddingModels = [];
    if (data.models) {
      for (const m of data.models) {
        console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods.join(', ')})`);
        if (m.supportedGenerationMethods.includes('embedContent')) {
          embeddingModels.push(m.name);
        }
      }
    }
    
    console.log('\nEmbedding models found:', embeddingModels);

    // Test text-embedding-004
    console.log('\nTesting text-embedding-004 single embed...');
    const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const embedRes = await fetch(embedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: 'Hello world' }] }
      })
    });
    const embedData = await embedRes.json();
    console.log('text-embedding-004 response keys:', Object.keys(embedData));
    if (embedData.error) {
      console.log('text-embedding-004 error:', embedData.error);
    } else {
      console.log('text-embedding-004 single embed success!');
    }

    // Test text-embedding-004 batch embed
    console.log('\nTesting text-embedding-004 batch embed...');
    const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`;
    const batchRes = await fetch(batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            model: 'models/text-embedding-004',
            content: { parts: [{ text: 'Hello world 1' }] }
          },
          {
            model: 'models/text-embedding-004',
            content: { parts: [{ text: 'Hello world 2' }] }
          }
        ]
      })
    });
    const batchData = await batchRes.json();
    console.log('text-embedding-004 batch response keys:', Object.keys(batchData));
    if (batchData.error) {
      console.log('text-embedding-004 batch error:', batchData.error);
    } else {
      console.log('text-embedding-004 batch embed success!');
    }
  } catch (err) {
    console.error('Fatal error running list models:', err);
  }
}

run();
