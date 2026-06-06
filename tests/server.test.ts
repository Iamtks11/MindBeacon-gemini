import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreate the Zod validation schemas from server.ts to test their rules
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

describe('Backend Zod Input Validation', () => {
  describe('Check-in Schema', () => {
    it('should pass with valid check-in parameters', () => {
      const validPayload = {
        mood: 7,
        stress: 4,
        sleep: 8,
        study: 6,
        concern: 'Backlog in math',
        examType: 'JEE',
        examPhase: 'Preparation Phase',
        stressTriggers: ['Syllabus Backlog', 'Time Management']
      };
      
      const res = checkinSchema.safeParse(validPayload);
      expect(res.success).toBe(true);
    });

    it('should fail with invalid mood or stress ranges', () => {
      const invalidPayload = {
        mood: 12, // Above 10
        stress: 0, // Below 1
        sleep: 8,
        study: 5
      };
      const res = checkinSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        const errors = res.error.format();
        expect(errors.mood).toBeDefined();
        expect(errors.stress).toBeDefined();
      }
    });

    it('should fail if sleep hours exceed 24 hours', () => {
      const invalidPayload = {
        mood: 5,
        stress: 5,
        sleep: 28, // Invalid
        study: 4
      };
      const res = checkinSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
    });
  });

  describe('Journal Schema', () => {
    it('should pass on valid entry text', () => {
      const res = journalSchema.safeParse({ entry: 'Feeling a bit anxious today about mock test marks.' });
      expect(res.success).toBe(true);
    });

    it('should fail on empty entries', () => {
      const res = journalSchema.safeParse({ entry: '' });
      expect(res.success).toBe(false);
    });
  });

  describe('Weekly Summary Schema', () => {
    it('should validate matching weekly list contents', () => {
      const payload = {
        data: {
          checkins: [
            { mood: 5, stress: 5, sleep: 7, study: 6, examType: 'NEET', examPhase: 'Mock Season', stressTriggers: [] }
          ],
          journalEmotions: ['Anxiety', 'Resilience']
        }
      };
      const res = weeklySchema.safeParse(payload);
      expect(res.success).toBe(true);
    });
  });

  describe('Rate Limiter Logic', () => {
    it('should rate limit requests when limit is exceeded', () => {
      const rateLimitsMap = new Map<string, { count: number; resetAt: number }>();
      const key = 'test-user';
      const now = Date.now();
      const limit = 3;
      const window = 60000;

      const checkRateLimit = (userKey: string): boolean => {
        const info = rateLimitsMap.get(userKey);
        if (!info || now > info.resetAt) {
          rateLimitsMap.set(userKey, { count: 1, resetAt: now + window });
          return true; // allowed
        } else {
          if (info.count >= limit) {
            return false; // blocked
          }
          info.count += 1;
          return true; // allowed
        }
      };

      expect(checkRateLimit(key)).toBe(true);
      expect(checkRateLimit(key)).toBe(true);
      expect(checkRateLimit(key)).toBe(true);
      expect(checkRateLimit(key)).toBe(false); // 4th request blocked
    });
  });
});
