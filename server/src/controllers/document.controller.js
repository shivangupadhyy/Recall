import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { documents } from '../config/schema.js';
import storageService from '../services/storageService.js';
import { addDocumentJob } from '../queues/embeddingQueue.js';

/**
 * @desc    Upload a PDF document
 * @route   POST /api/documents/upload
 * @access  Private
 */
export const uploadDocument = async (req, res) => {
  try {
    const { subject, title } = req.body;
    const file = req.file;

    // Validation
    if (!subject || !title) {
      // If file was uploaded, clean it up
      if (file) {
        await storageService.deleteFile(`/uploads/${file.filename}`);
      }
      return res.status(400).json({ error: 'Please provide subject and title' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Please upload a PDF file' });
    }

    // Save file via storage service
    const fileUrl = await storageService.saveFile(file);

    // Create document record in DB using Drizzle
    const [document] = await db.insert(documents).values({
      userId: req.user.id,
      subject,
      title,
      fileUrl,
      status: 'processing', // starts as processing, Phase 2 will queue the processing
    }).returning();

    // Add job to background queue for text extraction and embedding generation
    try {
      await addDocumentJob(document.id, document.fileUrl);
      console.log(`[Queue] Added document job for ID ${document.id}`);
    } catch (queueError) {
      console.error(`[Queue] Failed to add document ID ${document.id} to queue:`, queueError.message);
    }

    res.status(201).json({
      message: 'Document uploaded successfully, processing started',
      document: {
        _id: document.id, // Frontend might look for _id or id
        id: document.id,
        userId: document.userId,
        subject: document.subject,
        title: document.title,
        fileUrl: document.fileUrl,
        status: document.status,
        totalChunks: document.totalChunks,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error.message);
    res.status(500).json({ error: 'Server error during document upload' });
  }
};

/**
 * @desc    Get all documents for the authenticated user
 * @route   GET /api/documents
 * @access  Private
 */
export const getDocuments = async (req, res) => {
  try {
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, req.user.id))
      .orderBy(desc(documents.createdAt));

    // Map database structures for frontend compatibility if needed
    const formattedDocs = userDocuments.map(doc => ({
      _id: doc.id,
      id: doc.id,
      userId: doc.userId,
      subject: doc.subject,
      title: doc.title,
      fileUrl: doc.fileUrl,
      status: doc.status,
      totalChunks: doc.totalChunks,
      createdAt: doc.createdAt,
    }));

    res.status(200).json({ documents: formattedDocs });
  } catch (error) {
    console.error('Get documents error:', error.message);
    res.status(500).json({ error: 'Server error retrieving documents' });
  }
};

/**
 * @desc    Delete a document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
export const deleteDocument = async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, req.user.id)))
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    // Delete file from disk
    await storageService.deleteFile(document.fileUrl);

    // Delete from database
    await db.delete(documents).where(eq(documents.id, docId));

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error.message);
    res.status(500).json({ error: 'Server error deleting document' });
  }
};
