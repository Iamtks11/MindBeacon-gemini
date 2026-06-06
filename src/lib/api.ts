import { auth } from './firebase';

async function fetchWithAuth(url: string, body: any) {
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
  return res.json();
}

export const analyzeCheckin = (data: any) => fetchWithAuth('/api/analyze-checkin', data);
export const analyzeJournal = (entry: string) => fetchWithAuth('/api/analyze-journal', { entry });
export const analyzeWeekly = (data: any) => fetchWithAuth('/api/analyze-weekly', { data });
