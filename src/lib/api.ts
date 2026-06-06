import { auth } from './firebase';
import { 
  CheckinAnalysisRequest, 
  CheckinAnalysisResponse, 
  JournalAnalysisResponse, 
  WeeklyAnalysisRequest, 
  WeeklyAnalysisResponse 
} from '../types';

async function fetchWithAuth<T>(url: string, body: any): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'API Request failed');
  }
  return res.json() as Promise<T>;
}

export const analyzeCheckin = (data: CheckinAnalysisRequest): Promise<CheckinAnalysisResponse> => 
  fetchWithAuth<CheckinAnalysisResponse>('/api/analyze-checkin', data);

export const analyzeJournal = (entry: string): Promise<JournalAnalysisResponse> => 
  fetchWithAuth<JournalAnalysisResponse>('/api/analyze-journal', { entry });

export const analyzeWeekly = (data: WeeklyAnalysisRequest['data']): Promise<WeeklyAnalysisResponse> => 
  fetchWithAuth<WeeklyAnalysisResponse>('/api/analyze-weekly', { data });
