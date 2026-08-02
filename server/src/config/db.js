import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('sslmode=require') || connectionString?.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : false,
});

export const db = drizzle(pool, { schema });

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('Neon PostgreSQL Connection Established Successfully');
    client.release();
  } catch (error) {
    console.error(`Neon PostgreSQL Connection Error: ${error.message}`);
    // Do not crash the application immediately in development to allow server to start
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
