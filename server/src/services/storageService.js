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

/**
 * Handles uploading/saving files.
 * In a production S3 swap, this function would upload file.path to S3 and return the S3 URL.
 * @param {Express.Multer.File} file 
 * @returns {Promise<string>} File access URL
 */
export const saveFile = async (file) => {
  // For local files, multer will write them directly to our uploads directory.
  // We simply return the local access path.
  return `/uploads/${file.filename}`;
};

/**
 * Deletes a file from the server.
 * @param {string} fileUrl 
 * @returns {Promise<boolean>} Success status
 */
export const deleteFile = async (fileUrl) => {
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
