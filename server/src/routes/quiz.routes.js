import express from 'express';
import { getQuiz, generateQuiz } from '../controllers/quiz.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all quiz routes
router.use(protect);

router.get('/:docId', getQuiz);
router.post('/generate/:docId', generateQuiz);

export default router;
