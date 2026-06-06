export interface Checkin {
  id?: string;
  userId: string;
  mood: number;
  stress: number;
  sleep: number;
  study: number;
  concern?: string;
  beaconScore: number;
  riskLevel?: 'low' | 'medium' | 'high';
  summary?: string;
  recommendations?: string[];
  examType?: string;
  examPhase?: string;
  stressTriggers?: string[];
  createdAt: any; // Can be number or Firestore Timestamp
}

export interface JournalEntry {
  id?: string;
  userId: string;
  entry: string;
  identifiedEmotion?: string;
  reflection?: string;
  followUpQuestion?: string;
  createdAt: any; // Can be number or Firestore Timestamp
}

export interface WeeklyInsight {
  id?: string;
  userId: string;
  averageMood: string;
  topStressTriggers?: string[];
  positiveTrend: string;
  burnoutRisk: 'low' | 'medium' | 'high';
  startDate: number;
  endDate: number;
  createdAt: any; // Can be number or Firestore Timestamp
}
