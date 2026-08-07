# Recall — Production Deployment Guide

This guide describes how to deploy the **Recall** application (frontend and backend) to production.

---

## 1. Deploying the Backend (Render or Railway)
The backend requires a hosted environment running Node.js with connection to PostgreSQL (`pgvector`) and Redis.

### Option A: Render
1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository containing the **Recall** code.
3. Configure the following settings:
   * **Name**: `recall-backend`
   * **Root Directory**: `server`
   * **Environment**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
4. Click **Advanced** and add the following **Environment Variables**:
   * `NODE_ENV`: `production`
   * `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
   * `REDIS_URL`: *(Your Upstash Redis connection string)*
   * `GEMINI_API_KEY`: *(Your Google Gemini API key)*
   * `JWT_SECRET`: *(A secure random password string)*
   * `CLIENT_URL`: `https://your-frontend-app.vercel.app` *(update with your Vercel address once deployed)*
5. Click **Create Web Service**.

### Option B: Railway
1. Log in to [Railway](https://railway.app) and click **New Project > Deploy from GitHub**.
2. Select your repository. Click **Variables** and configure the environment variables listed above.
3. Set the **Root Directory** settings to `/server` in Railway settings if necessary.

---

## 2. Deploying the Frontend (Vercel)
The React client runs on Vite and connects to the backend API.

1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your GitHub repository.
3. Configure the following project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `client`
4. Expand the **Environment Variables** section and add:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://your-backend-app.onrender.com/api` *(Your deployed backend Render/Railway URL with `/api` appended)*
5. Click **Deploy**.

---

## 3. Post-Deployment Config Check
Once the Vercel frontend is deployed:
1. Copy the Vercel URL (e.g. `https://recall-companion.vercel.app`).
2. Go back to your backend (Render or Railway) settings.
3. Update the `CLIENT_URL` environment variable value to match your Vercel URL.
4. Save variables and allow the backend to rebuild/restart. This ensures CORS is fully allowed.
