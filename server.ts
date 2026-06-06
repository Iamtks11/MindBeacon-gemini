import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import fs from 'fs';

// Initialize Firebase Admin
let projectId = 'demo-project';
try {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  projectId = config.projectId;
} catch (e) {
  console.warn("Could not load firebase-applet-config.json");
}

try {
  admin.initializeApp({ projectId });
} catch (e) {
  console.warn("Firebase Admin Initialization error", e);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Firebase Auth token
  const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      (req as any).user = decoded;
      next();
    } catch (e) {
      console.error("Token verification failed", e);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  };

  // 1. Analyze Check-in
  app.post('/api/analyze-checkin', authenticate, async (req, res) => {
    try {
      const { mood, stress, sleep, study, concern } = req.body;
      const prompt = `Analyze this daily check-in from a student preparing for competitive exams (JEE/NEET/UPSC).
Mood (1-10): ${mood}
Stress (1-10): ${stress}
Sleep: ${sleep} hours
Study: ${study} hours
Concern: ${concern || 'None'}

Return a JSON with the following exact structure:
{
  "riskLevel": "low" | "medium" | "high",
  "summary": "a short empathetic summary",
  "recommendations": ["rec1", "rec2", "rec3"]
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to analyze' });
    }
  });

  // 2. Analyze Journal
  app.post('/api/analyze-journal', authenticate, async (req, res) => {
    try {
      const { entry } = req.body;
      const prompt = `Analyze this journal entry from a student preparing for competitive exams.
Entry: "${entry}"

Return a JSON with the following exact structure:
{
  "identifiedEmotion": "e.g., anxiety, self-doubt, motivation",
  "reflection": "a CBT-informed reflection to help them reframe or process",
  "followUpQuestion": "a question to prompt deeper thinking"
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to analyze' });
    }
  });

  // 3. Weekly Insights Summary
  app.post('/api/analyze-weekly', authenticate, async (req, res) => {
    try {
      const { data } = req.body;
      const prompt = `As a student wellness coach, give a weekly summary based on the following last 7 days of data points:
Data: ${JSON.stringify(data)}

Return a JSON with the following exact structure:
{
  "averageMood": "text like 'mostly anxious', 'improving', 'stable'",
  "topStressTriggers": ["trigger1", "trigger2"],
  "positiveTrend": "a specific positive trend observed",
  "burnoutRisk": "low" | "medium" | "high" 
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const dataRes = JSON.parse(response.text || '{}');
      res.json(dataRes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to analyze' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
