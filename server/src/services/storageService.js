import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads target directory (server/uploads)
const uploadDir = path.join(__dirname, '../../uploads');

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// AWS S3 client setup (lazy loaded dynamically to prevent crash if not npm installed yet)
let s3Client = null;
let PutObjectCommand = null;
let DeleteObjectCommand = null;
let s3Region = 'us-east-1';

const initS3 = async () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      const sdk = await import('@aws-sdk/client-s3');
      PutObjectCommand = sdk.PutObjectCommand;
      DeleteObjectCommand = sdk.DeleteObjectCommand;
      s3Region = process.env.AWS_REGION || 'us-east-1';
      
      const s3Config = {
        region: s3Region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      };

      if (process.env.S3_COMPAT_ENDPOINT) {
        s3Config.endpoint = process.env.S3_COMPAT_ENDPOINT;
        s3Config.forcePathStyle = true; // Required for compatibility providers (Cloudflare R2, Supabase S3, MinIO)
      }

      s3Client = new sdk.S3Client(s3Config);
      console.log('[Storage] AWS S3 client initialized successfully.');
    } catch (err) {
      console.warn('[Storage] AWS SDK @aws-sdk/client-s3 not installed or failed to load. Falling back to local storage.', err.message);
    }
  } else {
    console.log('[Storage] AWS S3 credentials not configured. Using local storage.');
  }
};

// Initialize S3 asynchronously
initS3();

/**
 * Handles uploading/saving files.
 * In a production S3 swap, this function would upload file.path to S3 and return the S3 URL.
 * @param {Express.Multer.File} file 
 * @returns {Promise<string>} File access URL
 */
export const saveFile = async (file) => {
  if (s3Client && PutObjectCommand) {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME is not configured in environment variables.');
    }

    const key = file.filename;
    const fileStream = fs.createReadStream(file.path);

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype || 'application/pdf',
      });

      await s3Client.send(command);

      // Clean up the temporary local file written by multer
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('[Storage] Failed to delete temporary local file:', err.message);
      }

      // Construct file url
      const publicUrl = process.env.S3_PUBLIC_URL_PREFIX
        ? `${process.env.S3_PUBLIC_URL_PREFIX.replace(/\/$/, '')}/${key}`
        : `https://${bucketName}.s3.${s3Region}.amazonaws.com/${key}`;

      console.log(`[Storage] Uploaded ${file.filename} to S3 bucket ${bucketName}. URL: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('[Storage] S3 upload error:', error.message);
      throw error;
    }
  }

  // Fallback: For local files, multer has already written them directly to our uploads directory.
  // We simply return the local access path.
  return `/uploads/${file.filename}`;
};

/**
 * Deletes a file from the server.
 * @param {string} fileUrl 
 * @returns {Promise<boolean>} Success status
 */
export const deleteFile = async (fileUrl) => {
  if (s3Client && DeleteObjectCommand && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) return false;

    try {
      const url = new URL(fileUrl);
      const pathname = url.pathname;
      // Key is the filename component of the URL pathname
      const key = pathname.substring(pathname.lastIndexOf('/') + 1);

      console.log(`[Storage] Deleting object ${key} from S3 bucket ${bucketName}...`);
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (err) {
      console.error(`[Storage] Failed to delete file from S3: ${fileUrl}`, err.message);
      return false;
    }
  }

  // Local storage deletion fallback
  try {
    const filename = fileUrl.replace('/uploads/', '');
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete local file at ${fileUrl}:`, err.message);
  }
  return false;
};

export default {
  saveFile,
  deleteFile
};
