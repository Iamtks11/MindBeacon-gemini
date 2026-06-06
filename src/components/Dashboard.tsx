import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Checkin, JournalEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Activity, BookOpen, Quote } from 'lucide-react';

export function Dashboard({ user }: { user: User }) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const checkinsQ = query(
      collection(db, 'users', user.uid, 'checkins'),
      where('createdAt', '>=', sevenDaysAgo),
      orderBy('createdAt', 'asc')
    );
    
    const unsubCheckins = onSnapshot(checkinsQ, (snap) => {
      setCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users/checkins'));

    const journalsQ = query(
      collection(db, 'users', user.uid, 'journals'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    
    const unsubJournals = onSnapshot(journalsQ, (snap) => {
      setJournals(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users/journals'));

    return () => {
      unsubCheckins();
      unsubJournals();
    };
  }, [user.uid]);

  if (loading) {
    return <div className="text-stone-500 animate-pulse">Loading dashboard...</div>;
  }

  const todayCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null;
  const isToday = todayCheckin && (Date.now() - todayCheckin.createdAt < 24 * 60 * 60 * 1000);

  const chartData = checkins.map(c => ({
    date: format(new Date(c.createdAt), 'MMM dd'),
    mood: c.mood,
    stress: c.stress
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Beacon Score Card */}
        <Card className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-[#edeae4]">
          <CardHeader className="text-center pb-2 px-0 pt-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#9a9a80]">Beacon Score</CardTitle>
            <CardDescription className="hidden">Your current wellness index</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-0 pb-0">
            {isToday ? (
              <div className="relative flex h-40 w-40 items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f2ef" strokeWidth="12" />
                  <motion.circle 
                    cx="80" cy="80" r="70" fill="none" stroke="#5a5a40" strokeWidth="12"
                    strokeDasharray="440"
                    initial={{ strokeDashoffset: 440 }}
                    animate={{ strokeDashoffset: 440 - (440 * todayCheckin!.beaconScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold font-serif text-[#2d2d2d]">{todayCheckin!.beaconScore}</span>
                  <span className="text-xs font-medium text-[#9a9a80]">Optimal</span>
                </div>
              </div>
            ) : (
               <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#fdfbf7] text-[#9a9a80] text-sm text-center p-4">
                 No check-in today
               </div>
            )}
            {isToday && (
              <p className="mt-4 text-sm text-[#7a7a60] leading-relaxed text-center">
                You're maintaining a steady focus. Keep it up!
              </p>
            )}
          </CardContent>
        </Card>

        {/* 7-Day Trend Chart */}
        <Card className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-[#edeae4]">
          <CardHeader className="p-0 mb-6 border-b-0 space-y-0 flex-row justify-between items-center">
            <CardTitle className="text-lg font-serif font-bold text-[#2d2d2d] m-0">Mood & Stress Trends</CardTitle>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#2d2d2d]">
                <span className="w-3 h-3 rounded-full bg-[#5a5a40]"></span> Mood
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#2d2d2d]">
                <span className="w-3 h-3 rounded-full bg-[#d9e0d7]"></span> Stress
              </div>
            </div>
            <CardDescription className="hidden">Mood vs Stress over time</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {chartData.length > 0 ? (
              <div className="h-48 w-full" aria-label="Line chart showing mood vs stress over 7 days">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f2ef" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9a9a80' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9a9a80' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #edeae4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', backgroundColor: 'white' }}
                      labelStyle={{ fontWeight: 600, color: '#4a4a35', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="mood" name="Mood" stroke="#5a5a40" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="stress" name="Stress" stroke="#d9e0d7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-[#9a9a80] text-sm">
                Not enough data yet. Complete daily check-ins to see your trends!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {/* Today's AI Insight */}
         <div className="bg-[#f4f1ec] rounded-3xl p-6 border border-[#e5e1da] relative overflow-hidden shadow-sm">
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-[#d9e0d7] rounded-full blur-3xl opacity-50"></div>
            <div className="relative z-10 flex flex-col h-full">
              {isToday ? (
                <div className="flex items-start gap-4 h-full">
                  <div className="p-3 bg-white rounded-2xl shadow-sm shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a5a40" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="flex flex-col h-full">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#9a9a80] mb-2">Gemini AI Analysis</h4>
                    <p className="text-md font-serif italic text-[#4a4a35] leading-relaxed mb-4">
                      "{todayCheckin.summary}"
                    </p>
                    <div className="mt-auto">
                      <div className="flex flex-wrap gap-2">
                        {todayCheckin.recommendations?.slice(0,2).map((rec, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-[#e5e1da] rounded-full text-[10px] font-bold text-[#4a4a35] truncate max-w-[200px]">
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                 <p className="text-[#9a9a80] text-sm">Complete today's check-in to get your AI-powered wellness summary.</p>
              )}
            </div>
         </div>

         {/* Recent Journals */}
         <Card className="bg-white rounded-3xl p-6 shadow-sm border border-[#edeae4]">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#9a9a80]">
                Emotional Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {journals.length > 0 ? (
                <div className="space-y-4">
                  {journals.slice(0,2).map((j) => (
                    <div key={j.id} className="pb-3 border-b border-[#e5e1da] last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-[#fdfbf7] px-2 py-1 text-[10px] font-bold uppercase text-[#9a9a80] border border-[#e5e1da]">
                          {j.identifiedEmotion || 'Reflection'}
                        </span>
                        <span className="text-xs text-[#9a9a80]">{format(new Date(j.createdAt), 'MMM dd')}</span>
                      </div>
                      <div className="flex gap-3">
                         <p className="text-sm text-[#4a4a35] italic">"{j.reflection}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#9a9a80] text-sm">No journal entries yet.</p>
              )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
