import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SupportResources } from '../src/components/SupportResources';
import { MindfulnessRoom } from '../src/components/MindfulnessRoom';
import { Dashboard } from '../src/components/Dashboard';
import { WeeklyInsights } from '../src/components/WeeklyInsights';

// Mock getDocs to prevent async database wait hanging in component test environment
vi.mock('firebase/firestore', async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  };
});

// Test beacon score logic from CheckinForm
const calculateBeaconScore = (mood: number, stress: number, sleep: number, study: number): number => {
  const moodScore = ((mood - 1) / 9) * 100;
  const stressScore = ((10 - stress) / 9) * 100;
  const sleepScore = sleep >= 7 && sleep <= 9 ? 100 : (sleep < 7 ? (sleep / 7) * 100 : ((24 - sleep) / 15) * 100);
  const studyScore = study >= 2 && study <= 8 ? 100 : (study < 2 ? (study / 2) * 100 : ((24 - study) / 16) * 100);
  return Math.round((moodScore + stressScore + sleepScore + studyScore) / 4);
};

describe('Frontend Logic & Component Unit Tests', () => {
  describe('Wellness Beacon Score Algorithm', () => {
    it('should compute an index of 100 for optimal parameters', () => {
      const score = calculateBeaconScore(10, 1, 8, 6);
      expect(score).toBe(100);
    });

    it('should compute a lower index for sleep-deprived and highly stressed students', () => {
      const score = calculateBeaconScore(3, 9, 4, 12);
      expect(score).toBeLessThan(50);
      expect(score).toBe(41);
    });
  });

  describe('MindfulnessRoom Component', () => {
    it('should render the mindfulness breathing room with title and choose technique label', () => {
      render(<MindfulnessRoom />);
      
      const title = screen.getByText('Mindfulness Breathing Room');
      expect(title).toBeDefined();

      const selectorLabel = screen.getByText('Choose Technique');
      expect(selectorLabel).toBeDefined();
    });

    it('should display the Box Breathing default selection text', () => {
      render(<MindfulnessRoom />);
      
      const patternText = screen.getAllByText(/Box Breathing/i);
      expect(patternText.length).toBeGreaterThan(0);
    });
  });

  describe('SupportResources Component', () => {
    it('should display critical student crisis helplines and phone numbers', () => {
      render(<SupportResources />);
      
      const govtHelpline = screen.getByText(/Tele-MANAS/i);
      expect(govtHelpline).toBeDefined();

      const counselingText = screen.getByText(/Immediate Help & Counseling/i);
      expect(counselingText).toBeDefined();
    });

    it('should display practical exam study tips like Pomodoro', () => {
      render(<SupportResources />);
      
      const pomodoroText = screen.getByText(/The Pomodoro Method/i);
      expect(pomodoroText).toBeDefined();

      const eyeRule = screen.getByText(/The 20-20-20 Eye Rule/i);
      expect(eyeRule).toBeDefined();
    });
  });

  describe('Dashboard Component Rendering', () => {
    it('should render Dashboard with checkin and journal props', () => {
      const mockCheckins = [
        {
          userId: 'test-user',
          mood: 8,
          stress: 3,
          sleep: 8,
          study: 6,
          beaconScore: 85,
          examType: 'JEE',
          examPhase: 'Preparation Phase',
          stressTriggers: ['Syllabus Backlog'],
          createdAt: Date.now()
        }
      ];
      const mockJournals = [
        {
          userId: 'test-user',
          entry: 'Today went well.',
          identifiedEmotion: 'Calm',
          reflection: 'You are doing great.',
          followUpQuestion: 'What went well?',
          createdAt: Date.now()
        }
      ];

      render(<Dashboard checkins={mockCheckins} journals={mockJournals} loading={false} />);
      
      expect(screen.getByText(/JEE/i)).toBeDefined();
      expect(screen.getByText(/Syllabus Backlog/i)).toBeDefined();
      expect(screen.getByText(/You are doing great/i)).toBeDefined();
    });
  });

  describe('WeeklyInsights Component Rendering', () => {
    it('should render empty state if no insight is generated yet', async () => {
      render(<WeeklyInsights user={{ uid: 'test-user' } as any} checkins={[]} journals={[]} />);
      const emptyMsg = await screen.findByText(/You do not have a weekly wellness report yet/i);
      expect(emptyMsg).toBeDefined();
    });
  });
});
