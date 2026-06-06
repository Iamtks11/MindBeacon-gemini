import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import fs from 'fs';
import { z } from 'zod';

// Declare custom Request interface for Type Safety
interface AuthenticatedRequest extends express.Request {
  user?: admin.auth.DecodedIdToken;
}

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

// Zod Validation Schemas
const checkinSchema = z.object({
  mood: z.number().int().min(1).max(10),
  stress: z.number().int().min(1).max(10),
  sleep: z.number().min(0).max(24),
  study: z.number().min(0).max(24),
  concern: z.string().max(2000).optional(),
  examType: z.string().max(50).optional(),
  examPhase: z.string().max(50).optional(),
  stressTriggers: z.array(z.string().max(100)).max(10).optional(),
});

const journalSchema = z.object({
  entry: z.string().min(1).max(5000),
});

const weeklySchema = z.object({
  data: z.object({
    checkins: z.array(z.object({
      mood: z.number().int().min(1).max(10),
      stress: z.number().int().min(1).max(10),
      sleep: z.number().min(0).max(24),
      study: z.number().min(0).max(24),
      concern: z.string().max(2000).optional(),
      examType: z.string().max(50).optional(),
      examPhase: z.string().max(50).optional(),
      stressTriggers: z.array(z.string().max(100)).max(10).optional(),
    })).max(100),
    journalEmotions: z.array(z.string().max(100)).max(100).optional(),
  }),
});

// In-Memory Rate Limiter Map
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per minute

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; font-src 'self' data: *; img-src 'self' data: *; connect-src 'self' ws: wss: http: https: *; frame-src 'self' *;"
    );
    next();
  });

  // Middleware to verify Firebase Auth token
  const authenticate = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = decoded;
      next();
    } catch (e) {
      console.error("Token verification failed", e);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  };

  // Rate Limiting Middleware (Applied to AI Endpoints)
  const rateLimiter = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const user = req.user;
    const key = user ? user.uid : req.ip || 'anonymous';
    const now = Date.now();
    
    const limitInfo = rateLimits.get(key);
    if (!limitInfo || now > limitInfo.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      next();
    } else {
      if (limitInfo.count >= MAX_REQUESTS_PER_WINDOW) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
      }
      limitInfo.count += 1;
      next();
    }
  };

  // 1. Analyze Check-in
  app.post('/api/analyze-checkin', authenticate, rateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate input
      const validation = checkinSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid check-in data', details: validation.error.format() });
        return;
      }

      const { mood, stress, sleep, study, concern, examType, examPhase, stressTriggers } = validation.data;
      
      const prompt = `You are an empathetic, professional student wellness coach specializing in academic stress management.
Analyze this daily check-in from a student preparing for examinations.

Context:
- Target Exam: ${examType || 'Not specified'} (e.g. JEE, NEET, UPSC, Board Exams)
- Exam Preparation Phase: ${examPhase || 'Not specified'} (e.g. Preparation Phase, Mock Test Season, Exam Week, Result Season)
- Mood (1-10): ${mood} (1 is poor, 10 is great)
- Stress (1-10): ${stress} (1 is calm, 10 is overwhelmed)
- Sleep: ${sleep} hours
- Stress Triggers identified: ${stressTriggers && stressTriggers.length > 0 ? stressTriggers.join(', ') : 'None'}
- Biggest Concern: "${concern || 'None'}"

Provide a JSON response with the following exact structure:
{
  "riskLevel": "low" | "medium" | "high",
  "summary": "A short (2-3 sentences), empathetic summary validating their feelings and study progress in the context of their ${examType || 'exam'}.",
  "recommendations": [
    "A direct study/wellness balance recommendation tailored to their ${examPhase || 'preparation'} phase.",
    "A practical, short action item targeting their major stress triggers or concern.",
    "A quick mindfulness/breathing suggestion."
  ]
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
  app.post('/api/analyze-journal', authenticate, rateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate input
      const validation = journalSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid journal entry', details: validation.error.format() });
        return;
      }

      const { entry } = validation.data;
      const prompt = `You are a student wellness coach trained in Cognitive Behavioral Therapy (CBT) and academic stress management.
Analyze this emotional journal entry from a student preparing for competitive exams.

Entry: "${entry}"

Identify if the student exhibits any cognitive distortions common in exam preparation (e.g., all-or-nothing thinking like "If I don't clear JEE, my life is over", catastrophizing mock test scores, emotional reasoning, or overgeneralization).

Provide a JSON response with the following exact structure:
{
  "identifiedEmotion": "The primary emotion or cognitive state (e.g., Anxiety, Self-Doubt, Overwhelm, Motivation, Backlog stress)",
  "reflection": "A CBT-informed, warm reflection. Validate their stress, gently highlight any cognitive distortion (if present), and help them reframe the thoughts productively.",
  "followUpQuestion": "A constructive, open-ended question that encourages the student to reflect on their coping mechanisms or strengths."
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
  app.post('/api/analyze-weekly', authenticate, rateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate input
      const validation = weeklySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid weekly data', details: validation.error.format() });
        return;
      }

      const { data } = validation.data;
      const prompt = `You are an expert student wellness coach. Based on the following last 7 days of daily check-ins and journal emotions, analyze their trends and provide wellness guidance.

Data: ${JSON.stringify(data)}

Provide a JSON response with the following exact structure:
{
  "averageMood": "A short descriptive phase (e.g., 'Anxious but resilient', 'Stable with mock-test stress', 'Improving')",
  "topStressTriggers": ["A list of up to 3 primary stress themes observed from their concerns, triggers, or journal emotions"],
  "positiveTrend": "A specific, encouraging positive trend observed (e.g., consistent study hours, stable sleep, or positive reframing in journals)",
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
