import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { documents, quizzes } from '../config/schema.js';
import { addQuizJob, quizQueue } from '../queues/quizQueue.js';

/**
 * @desc    Get quiz for a document
 * @route   GET /api/quizzes/:docId
 * @access  Private
 */
export const getQuiz = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    const userId = req.user.id;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Verify document belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    // 1. Check if quiz already exists in database
    const [quizRecord] = await db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.documentId, docId), eq(quizzes.userId, userId)))
      .limit(1);

    if (quizRecord) {
      const questions = JSON.parse(quizRecord.questions);
      return res.status(200).json({ status: 'ready', questions });
    }

    // 2. If quiz does not exist in DB, check if it's currently processing in BullMQ
    const jobs = await quizQueue.getJobs(['active', 'waiting', 'delayed']);
    const isGenerating = jobs.some(
      (job) => job.data.documentId === docId && job.data.userId === userId
    );

    if (isGenerating) {
      return res.status(200).json({ status: 'generating' });
    }

    // 3. Otherwise, it is not enqueued yet
    res.status(200).json({ status: 'not_generated' });
  } catch (error) {
    console.error('Error in getQuiz:', error.message);
    res.status(500).json({ error: 'Server error retrieving quiz details' });
  }
};

/**
 * @desc    Trigger enqueuing a quiz generation job
 * @route   POST /api/quizzes/generate/:docId
 * @access  Private
 */
export const generateQuiz = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    const userId = req.user.id;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Verify document belongs to user and is ready
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is still processing notes text. Please wait.' });
    }

    // 1. Check if quiz already exists
    const [quizRecord] = await db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.documentId, docId), eq(quizzes.userId, userId)))
      .limit(1);

    if (quizRecord) {
      const questions = JSON.parse(quizRecord.questions);
      return res.status(200).json({ status: 'ready', questions });
    }

    // 2. Check if job is already running
    const jobs = await quizQueue.getJobs(['active', 'waiting', 'delayed']);
    const isGenerating = jobs.some(
      (job) => job.data.documentId === docId && job.data.userId === userId
    );

    if (isGenerating) {
      return res.status(200).json({ status: 'generating' });
    }

    // 3. Enqueue the quiz generation job
    console.log(`[Quiz API] Enqueuing quiz generation job for doc ID ${docId}...`);
    await addQuizJob(docId, userId);

    res.status(202).json({ status: 'generating', message: 'Quiz generation started in background' });
  } catch (error) {
    console.error('Error in generateQuiz:', error.message);
    res.status(500).json({ error: error.message || 'Server error starting quiz generation' });
  }
};
