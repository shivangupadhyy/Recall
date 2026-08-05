import express from 'express';
import { getFlashcards, generateFlashcards, updateFlashcardsReview } from '../controllers/flashcard.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all flashcard routes
router.use(protect);

router.get('/:docId', getFlashcards);
router.post('/generate/:docId', generateFlashcards);
router.put('/:docId', updateFlashcardsReview);

export default router;
