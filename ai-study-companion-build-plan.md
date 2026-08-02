# AI-Powered Study Companion — Complete Build Plan
### (Upload Notes → Auto Quiz/Flashcards → RAG Doubt-Solving Chat)

---

## 1. Project Overview

**Problem it solves:** Students have piles of PDF notes/slides but no fast way to test themselves or get doubts answered *from their own material* (not generic internet answers).

**What you're building:** A web app where a student uploads their notes, and the system:
1. Lets them chat with an AI that answers using only their uploaded notes (RAG)
2. Auto-generates quizzes from the notes
3. Auto-generates flashcards from the notes
4. Tracks their progress and weak areas

---

## 2. High-Level Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│   React     │─────▶│   Node.js /  │─────▶│   MongoDB      │
│  Frontend   │◀─────│   Express    │◀─────│  (Atlas +      │
│ (Tailwind)  │      │   API        │      │  Vector Search)│
└─────────────┘      └──────┬───────┘      └───────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐    ┌──────▼──────┐
              │ Redis +   │    │  LLM API     │
              │ BullMQ    │    │ (OpenAI/     │
              │ (job queue│    │  Claude API) │
              │  for heavy│    └──────────────┘
              │  tasks)   │
              └───────────┘
```

**Flow when a student uploads a PDF:**
`Upload → Extract text → Chunk text → Generate embeddings → Store in vector DB → Ready for chat/quiz/flashcards`

**Flow when a student asks a doubt:**
`Question → Embed question → Vector search top-K relevant chunks from THEIR notes → Send chunks + question to LLM → Answer with citation (page/section)`

---

## 3. Tech Stack (mapped to what you already know)

| Layer | Tool | Notes |
|---|---|---|
| Frontend | React + TypeScript + Tailwind CSS | You already use this |
| Backend | Node.js + Express | Your existing strength |
| Database | MongoDB Atlas | Also stores vector embeddings (Atlas Vector Search) |
| PDF parsing | `pdf-parse` npm package | Extracts raw text from PDFs |
| Chunking | Custom logic (~500-800 tokens per chunk, with overlap) | No library needed, just string splitting logic |
| Embeddings | OpenAI `text-embedding-3-small` (cheap) or Claude-compatible embedding API | Converts text chunks → vectors |
| LLM (chat/quiz/flashcards) | OpenAI GPT-4o-mini or Claude API | Answering, quiz generation, flashcard generation |
| Job Queue | Redis + BullMQ | Handles slow tasks: embedding generation, quiz generation — you already know Redis |
| Auth | JWT + Bcrypt | You already use this |
| File storage | Local disk (MVP) → AWS S3 (later) | Store uploaded PDFs |
| Hosting | Vercel (frontend), Render (backend + Redis) | You already use both |

---

## 4. Folder Structure

```
study-companion/
│
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                # Login, Signup forms
│   │   │   ├── upload/              # PDF upload UI
│   │   │   ├── chat/                # Doubt-solving chat UI
│   │   │   ├── quiz/                # Quiz taking UI
│   │   │   ├── flashcards/          # Flashcard review UI
│   │   │   └── dashboard/           # Progress, subject list
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SubjectView.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── QuizPage.tsx
│   │   │   └── FlashcardsPage.tsx
│   │   ├── api/                     # Axios calls to backend
│   │   ├── context/                 # Auth context
│   │   ├── hooks/
│   │   └── App.tsx
│   └── package.json
│
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # MongoDB connection
│   │   │   └── redis.js             # Redis connection
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Document.js          # Uploaded PDF metadata
│   │   │   ├── Chunk.js             # Text chunks + embeddings
│   │   │   ├── Quiz.js
│   │   │   ├── Flashcard.js
│   │   │   └── ChatHistory.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── document.routes.js
│   │   │   ├── chat.routes.js
│   │   │   ├── quiz.routes.js
│   │   │   └── flashcard.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── document.controller.js
│   │   │   ├── chat.controller.js
│   │   │   ├── quiz.controller.js
│   │   │   └── flashcard.controller.js
│   │   ├── services/
│   │   │   ├── pdfExtractor.js      # pdf-parse logic
│   │   │   ├── chunker.js           # Text chunking logic
│   │   │   ├── embeddingService.js  # Calls embedding API
│   │   │   ├── vectorSearch.js      # MongoDB Atlas vector search queries
│   │   │   ├── llmService.js        # Calls LLM API for chat/quiz/flashcards
│   │   │   └── ragPipeline.js       # Orchestrates retrieval + generation
│   │   ├── queues/
│   │   │   ├── embeddingQueue.js    # BullMQ queue for embedding jobs
│   │   │   ├── quizQueue.js
│   │   │   └── workers/
│   │   │       ├── embeddingWorker.js
│   │   │       └── quizWorker.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   └── app.js
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 5. Database Schema (MongoDB)

**User**
```js
{ _id, name, email, password (hashed), college, createdAt }
```

**Document** (an uploaded PDF)
```js
{
  _id, userId, subject, title, fileUrl,
  status: "processing" | "ready" | "failed",
  totalChunks, createdAt
}
```

**Chunk** (a piece of text + its embedding)
```js
{
  _id, documentId, userId, text,
  embedding: [1536 floats],   // vector field, indexed for Atlas Vector Search
  pageNumber, chunkIndex
}
```

**Quiz**
```js
{
  _id, documentId, userId,
  questions: [{ question, options: [], correctAnswer, explanation }],
  createdAt
}
```

**Flashcard**
```js
{
  _id, documentId, userId,
  cards: [{ front, back, lastReviewed, knownStatus }]
}
```

**ChatHistory**
```js
{
  _id, userId, documentId,
  messages: [{ role: "user"|"assistant", content, sourceChunks: [] }]
}
```

---

## 6. Build Order (Phase-by-Phase)

### Phase 0 — Setup (Day 1-2)
- Init repo (client + server folders)
- Set up MongoDB Atlas cluster (enable Vector Search)
- Set up Redis instance (Render Redis or Upstash)
- Set up `.env` with API keys (OpenAI/Claude, MongoDB URI, Redis URL)
- Basic Express server + React app connected, health-check route working

### Phase 1 — Auth + Upload (Day 3-6)
- JWT auth (signup/login) — reuse your existing pattern
- File upload endpoint (multer) → save PDF, create `Document` record with status `processing`
- Frontend: upload form + document list per subject

### Phase 2 — RAG Pipeline (Day 7-14) — **this is the core, most important part**
1. `pdfExtractor.js`: extract raw text from uploaded PDF
2. `chunker.js`: split text into ~500-800 token chunks with ~50 token overlap, tagged with page number
3. `embeddingService.js`: send each chunk to embedding API, get vector back
4. Store chunks + embeddings in MongoDB, create Atlas Vector Search index
5. Wire this whole thing through a BullMQ queue (`embeddingQueue`) so upload doesn't block the API — mark `Document.status = "ready"` when done
6. **Test point:** confirm you can manually query vector search and get relevant chunks back for a sample question

### Phase 3 — RAG Chat (Day 15-19)
1. `vectorSearch.js`: given a question, embed it, run `$vectorSearch` aggregation in MongoDB to get top 5 chunks
2. `ragPipeline.js`: build a prompt = system instructions + retrieved chunks + user question → send to LLM
3. Return answer + which chunks/pages were used (citation)
4. Frontend: simple chat UI, shows AI answer with "Source: Page X" tags
5. **This is your first fully demoable feature — get it solid before moving on**

### Phase 4 — Quiz Generator (Day 20-24)
1. Backend: pick a document → pull all its chunks → send to LLM with a prompt like "generate 10 MCQs with 4 options each, mark correct answer, from this content"
2. Run this as a background job (`quizQueue`) since it can be slow
3. Store generated quiz in DB
4. Frontend: quiz-taking UI (question, 4 options, instant feedback, score at end)

### Phase 5 — Flashcards (Day 25-28)
1. Similar to quiz: LLM generates Q&A pairs from chunks
2. Frontend: flip-card UI, "Know it / Don't know it" buttons
3. Simple spaced repetition: cards marked "don't know" reappear sooner

### Phase 6 — Progress Dashboard (Day 29-31)
- Track: documents uploaded, quizzes attempted + scores, flashcards reviewed, weak topics (based on wrong quiz answers)
- Simple charts (you can use `recharts`)

### Phase 7 — Polish + Real Launch (Day 32-35)
- Mobile-responsive check (students will use phones)
- Add subject-sharing: one upload benefits the whole batch (this is what gets you real usage numbers)
- Deploy: frontend → Vercel, backend → Render
- Share with your KIET batch/WhatsApp groups → start collecting real usage data

---

## 7. Key Technical Challenges (talk about these in interviews)

- **Chunking strategy**: too small = loses context, too large = irrelevant info pollutes answers. You'll need to tune chunk size + overlap.
- **Hallucination control**: instruct the LLM strictly to answer *only* from provided chunks, and say "not found in your notes" if it isn't there.
- **Cost control**: embedding + LLM calls cost money per request — cache embeddings (never re-embed the same doc), use a cheap model for quiz/flashcard generation.
- **Async processing**: uploads and quiz generation are slow (~10-30 sec) — must use job queues so the UI doesn't freeze.
- **Scaling vector search**: MongoDB Atlas Vector Search has index size limits on free tier — worth knowing your ceiling.

---

## 8. Resume Bullet (once built + used)

> *"Built a full-stack RAG-based study platform (PDF parsing → chunking → embeddings → MongoDB Atlas Vector Search → LLM-grounded answers) enabling students to query their own notes with cited sources; generated auto-quizzes and flashcards from uploaded material; used by [X] students across [Y] subjects at KIET, processed via async job queues (Redis + BullMQ) for scalability."*

---

## 9. Suggested Timeline
~5 weeks part-time (evenings/weekends) alongside your internship, phase by phase as above. Phase 2 (RAG pipeline) is the hardest and most important — don't rush it, since it's what makes this project resume-worthy rather than just another CRUD app.
