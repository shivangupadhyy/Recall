import express from 'express';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/document.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/multer.js';

const router = express.Router();

// Apply auth protection to all document routes
router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);

export default router;
