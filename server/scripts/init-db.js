import 'dotenv/config';
import pkg from 'pg';

const { Client } = pkg;

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
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
