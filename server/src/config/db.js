import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

// If sslmode is in URL, strip it to avoid node-postgres ssl override, and configure ssl object directly
const cleanConnectionString = connectionString
  ? connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
  : connectionString;

const isCloudPostgres = connectionString?.includes('neon.tech') || 
                        connectionString?.includes('supabase.co') || 
                        connectionString?.includes('supabase.com') ||
                        connectionString?.includes('sslmode=require');

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: isCloudPostgres ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL Connection Established Successfully');
    client.release();
  } catch (error) {
    console.error(`PostgreSQL Connection Error: ${error.message}`);
    // Do not crash the application immediately in development to allow server to start
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
