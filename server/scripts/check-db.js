import 'dotenv/config';
import pkg from 'pg';

const { Client } = pkg;

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await client.connect();
    
    const extensions = await client.query('SELECT extname, extnamespace::regnamespace AS schema FROM pg_extension;');
    console.log('Installed extensions:');
    console.table(extensions.rows);

    const searchPath = await client.query('SHOW search_path;');
    console.log('Current search path:', searchPath.rows[0].search_path);

    const schemas = await client.query('SELECT schema_name FROM information_schema.schemata;');
    console.log('Available schemas:');
    console.table(schemas.rows);

  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await client.end();
  }
};

run();
