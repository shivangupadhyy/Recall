import express from 'express';
import { 
  logActivity, getSummary, getAnalytics, getSocial, getInsights, getRecentActivities 
} from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all dashboard routes
router.use(protect);

router.post('/activity', logActivity);
router.get('/summary', getSummary);
router.get('/analytics', getAnalytics);
router.get('/social', getSocial);
router.get('/insights', getInsights);
router.get('/activity/recent', getRecentActivities);

export default router;
