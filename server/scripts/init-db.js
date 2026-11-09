import 'dotenv/config';
import pkg from 'pg';

const { Client } = pkg;

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const isCloud = connectionString.includes('sslmode=require') || 
                  connectionString.includes('neon.tech') || 
                  connectionString.includes('supabase.co') || 
                  connectionString.includes('supabase.com');

  const client = new Client({
    connectionString,
    ssl: isCloud ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('Connected to Neon PostgreSQL.');
    console.log('Enabling pgvector extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Successfully enabled pgvector extension!');
  } catch (error) {
    console.error('Failed to enable pgvector extension:', error.message);
  } finally {
    await client.end();
  }
};

run();
