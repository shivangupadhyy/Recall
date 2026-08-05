import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { documents, flashcards } from '../config/schema.js';
import { addFlashcardJob, flashcardQueue } from '../queues/flashcardQueue.js';

/**
 * @desc    Get flashcards for a document
 * @route   GET /api/flashcards/:docId
 * @access  Private
 */
export const getFlashcards = async (req, res) => {
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

    // 1. Check if flashcards already exist in database
    const [flashcardRecord] = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.documentId, docId), eq(flashcards.userId, userId)))
      .limit(1);

    if (flashcardRecord) {
      const cards = JSON.parse(flashcardRecord.cards);
      return res.status(200).json({ status: 'ready', cards });
    }

    // 2. If flashcards do not exist in DB, check if it's currently processing in BullMQ
    const jobs = await flashcardQueue.getJobs(['active', 'waiting', 'delayed']);
    const isGenerating = jobs.some(
      (job) => job.data.documentId === docId && job.data.userId === userId
    );

    if (isGenerating) {
      return res.status(200).json({ status: 'generating' });
    }

    // 3. Otherwise, it is not enqueued yet
    res.status(200).json({ status: 'not_generated' });
  } catch (error) {
    console.error('Error in getFlashcards:', error.message);
    res.status(500).json({ error: 'Server error retrieving flashcard details' });
  }
};

/**
 * @desc    Trigger enqueuing a flashcard generation job
 * @route   POST /api/flashcards/generate/:docId
 * @access  Private
 */
export const generateFlashcards = async (req, res) => {
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

    // 1. Check if flashcards already exist
    const [flashcardRecord] = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.documentId, docId), eq(flashcards.userId, userId)))
      .limit(1);

    if (flashcardRecord) {
      const cards = JSON.parse(flashcardRecord.cards);
      return res.status(200).json({ status: 'ready', cards });
    }

    // 2. Check if job is already running
    const jobs = await flashcardQueue.getJobs(['active', 'waiting', 'delayed']);
    const isGenerating = jobs.some(
      (job) => job.data.documentId === docId && job.data.userId === userId
    );

    if (isGenerating) {
      return res.status(200).json({ status: 'generating' });
    }

    // 3. Enqueue the flashcard generation job
    console.log(`[Flashcard API] Enqueuing flashcard generation job for doc ID ${docId}...`);
    await addFlashcardJob(docId, userId);

    res.status(202).json({ status: 'generating', message: 'Flashcards generation started in background' });
  } catch (error) {
    console.error('Error in generateFlashcards:', error.message);
    res.status(500).json({ error: error.message || 'Server error starting flashcards generation' });
  }
};

/**
 * @desc    Update Leitner spaced-repetition card state
 * @route   PUT /api/flashcards/:docId
 * @access  Private
 */
export const updateFlashcardsReview = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    const userId = req.user.id;
    const { cards } = req.body;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards must be provided as an array' });
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

    // Update DB record
    await db
      .update(flashcards)
      .set({
        cards: JSON.stringify(cards),
        updatedAt: new Date()
      })
      .where(and(eq(flashcards.documentId, docId), eq(flashcards.userId, userId)));

    res.status(200).json({ message: 'Flashcards progress saved successfully', status: 'ready', cards });
  } catch (error) {
    console.error('Error in updateFlashcardsReview:', error.message);
    res.status(500).json({ error: 'Server error saving flashcards review progress' });
  }
};
