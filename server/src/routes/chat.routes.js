import express from 'express';
import { getChatHistory, sendMessage, clearChatHistory } from '../controllers/chat.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all chat routes
router.use(protect);

router.get('/:docId', getChatHistory);
router.post('/:docId', sendMessage);
router.delete('/:docId', clearChatHistory);

export default router;
