import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Checkin, JournalEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Activity, BookOpen, ShieldAlert, Sparkles, Target, Zap, Clock, AlertCircle } from 'lucide-react';

const EXAM_DATES: Record<string, string> = {
  'JEE': '2027-01-24',
  'NEET': '2027-05-02',
  'UPSC': '2027-06-06',
  'Board Exams': '2027-02-15',
  'CUET': '2027-05-15',
  'CAT': '2026-11-29',
  'GATE': '2027-02-06'
};

const getSafeMillis = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  return Date.now();
};

export function Dashboard({ user }: { user: User }) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 7 days ago limit
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const checkinsQ = query(
      collection(db, 'users', user.uid, 'checkins'),
      where('createdAt', '>=', new Date(sevenDaysAgo)),
      orderBy('createdAt', 'asc')
    );
    
    const unsubCheckins = onSnapshot(checkinsQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
      // Sort in memory just in case the compound index is still building or ordering is missing
      data.sort((a, b) => getSafeMillis(a.createdAt) - getSafeMillis(b.createdAt));
      setCheckins(data);
      setLoading(false);
    }, (err) => {
      // Fallback: If query fails due to index missing, try a simpler query without orderBy/where
      console.warn("Index warning, falling back to simple query", err);
      const fallbackQ = query(
        collection(db, 'users', user.uid, 'checkins'),
        limit(20)
      );
      return onSnapshot(fallbackQ, (fallbackSnap) => {
        const data = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
        data.sort((a, b) => getSafeMillis(a.createdAt) - getSafeMillis(b.createdAt));
        setCheckins(data);
        setLoading(false);
      }, (e) => handleFirestoreError(e, OperationType.LIST, 'users/checkins'));
    });

    const journalsQ = query(
      collection(db, 'users', user.uid, 'journals'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    
    const unsubJournals = onSnapshot(journalsQ, (snap) => {
      setJournals(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
    }, (err) => {
      console.warn("Journals query failed, falling back to simple query", err);
      const fallbackJournalsQ = query(
        collection(db, 'users', user.uid, 'journals'),
        limit(5)
      );
      return onSnapshot(fallbackJournalsQ, (fallbackSnap) => {
        const data = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
        data.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt));
        setJournals(data);
      }, (e) => handleFirestoreError(e, OperationType.LIST, 'users/journals'));
    });

    return () => {
      unsubCheckins();
      unsubJournals();
    };
  }, [user.uid]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 w-full" role="status" aria-busy="true">
        <div className="h-32 bg-stone-100 rounded-3xl animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-48 bg-stone-100 rounded-3xl animate-pulse" />
          <div className="md:col-span-2 h-48 bg-stone-100 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  const todayCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null;
  const isToday = todayCheckin && (Date.now() - getSafeMillis(todayCheckin.createdAt) < 24 * 60 * 60 * 1000);

  const chartData = checkins.map(c => ({
    date: format(new Date(getSafeMillis(c.createdAt)), 'MMM dd'),
    mood: c.mood,
    stress: c.stress
  }));

  // Countdown logic
  const targetExam = todayCheckin?.examType || 'JEE';
  const examDateStr = EXAM_DATES[targetExam];
  let daysRemaining = 0;
  if (examDateStr) {
    const diff = new Date(examDateStr).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } else {
    // default/Other
    daysRemaining = 30;
  }

  // Stress Trigger aggregation (last 7 checkins)
  const triggerCounts: Record<string, number> = {};
  checkins.forEach((c) => {
    if (c.stressTriggers) {
      c.stressTriggers.forEach((t) => {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      });
    }
  });
  const sortedTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-6" role="region" aria-label="Student Wellness Dashboard">
      
      {/* Exam Countdown & Quick Status */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Countdown glassmorphic card */}
        <Card className="md:col-span-1 bg-gradient-to-br from-[#5a5a40]/90 to-[#4a4a35] text-white border-none rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-[#d9e0d7]/10 rounded-full blur-2xl"></div>
          <div>
            <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#d9e0d7]">
              <Target className="h-3 w-3" /> Focus Target
            </span>
            <h3 className="text-xl font-bold font-serif mt-2 tracking-tight">{targetExam} Preparation</h3>
            <p className="text-xs text-[#d9e0d7]/80 mt-1 uppercase tracking-wider">
              {todayCheckin?.examPhase || 'Preparation Phase'}
            </p>
          </div>
          <div className="my-5">
            <span className="text-5xl font-extrabold font-serif tracking-tight tabular-nums block">{daysRemaining}</span>
            <span className="text-xs text-[#d9e0d7]/90 font-medium">Days remaining to exam session</span>
          </div>
          <div className="text-[11px] text-[#d9e0d7]/70 italic border-t border-white/10 pt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Keep a balanced study schedule!
          </div>
        </Card>

        {/* Mood & Stress Trend Line Chart */}
        <Card className="md:col-span-2 bg-white border border-[#edeae4] rounded-3xl p-6 shadow-sm">
          <CardHeader className="p-0 mb-6 border-b-0 space-y-0 flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg font-serif font-bold text-[#2d2d2d]">Daily Mood & Stress Trends</CardTitle>
              <CardDescription className="text-xs text-[#7a7a60]">Last 7 check-in data points</CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4a4a35]">
                <span className="w-3 h-3 rounded-full bg-[#5a5a40]"></span> Mood
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a60]">
                <span className="w-3 h-3 rounded-full bg-[#d9e0d7]"></span> Stress
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {chartData.length > 0 ? (
              <div className="h-48 w-full" aria-label="A line chart displaying Mood and Stress trends over the last 7 check-ins">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f2ef" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9a9a80' }} dy={10} />
                    <YAxis domain={[1, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9a9a80' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #edeae4', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'white' }}
                      labelStyle={{ fontWeight: 600, color: '#4a4a35', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="mood" name="Mood" stroke="#5a5a40" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="stress" name="Stress" stroke="#d9e0d7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-[#9a9a80] text-sm text-center">
                Not enough check-in data yet.<br />Submit daily check-ins to unlock your charts.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Beacon Score Card */}
        <Card className="bg-white border border-[#edeae4] rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center">
          <CardHeader className="text-center pb-2 px-0 pt-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9a9a80]">Wellness Beacon Index</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-0 pb-0 w-full">
            {isToday ? (
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="72" cy="72" r="62" fill="none" stroke="#f3f2ef" strokeWidth="10" />
                  <motion.circle 
                    cx="72" cy="72" r="62" fill="none" stroke="#5a5a40" strokeWidth="10"
                    strokeDasharray="390"
                    initial={{ strokeDashoffset: 390 }}
                    animate={{ strokeDashoffset: 390 - (390 * todayCheckin!.beaconScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-serif text-[#2d2d2d]">{todayCheckin!.beaconScore}</span>
                  <span className="text-[10px] font-bold text-[#9a9a80] uppercase">Beacon Index</span>
                </div>
              </div>
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#fdfbf7] text-[#9a9a80] text-xs text-center p-4 border border-[#edeae4]">
                Complete daily check-in to compute score
              </div>
            )}
            {isToday && (
              <p className="mt-4 text-xs text-[#7a7a60] leading-relaxed text-center font-medium">
                Score based on mood, stress, sleep patterns, and study workload.
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI Actionable Recommendations */}
        <div className="bg-[#f4f1ec] border border-[#e5e1da] rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-[#d9e0d7] rounded-full blur-3xl opacity-40"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <span className="inline-flex items-center gap-1 bg-[#5a5a40]/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#5a5a40] mb-3">
                <Sparkles className="h-3 w-3" /> Personalized Advice
              </span>
              {isToday ? (
                <div className="space-y-3">
                  <p className="text-sm font-serif italic text-[#4a4a35] leading-relaxed">
                    "{todayCheckin.summary}"
                  </p>
                  <div className="space-y-1.5 pt-2">
                    {todayCheckin.recommendations?.slice(0, 2).map((rec, i) => (
                      <div key={i} className="flex gap-2 items-start text-xs text-[#4a4a35] leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5a5a40] mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#7a7a60] leading-relaxed">
                  Log your day with the daily check-in to receive instant AI stress coaching and personalized balance advice.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Triggers & Journal Snippet */}
        <Card className="bg-white border border-[#edeae4] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9a9a80] mb-3 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Key Stress Triggers
            </h4>
            {sortedTriggers.length > 0 ? (
              <div className="space-y-2">
                {sortedTriggers.map(([trigger, count], idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#4a4a35]">
                      <span>{trigger}</span>
                      <span className="text-[#9a9a80]">{count}x logged</span>
                    </div>
                    <div className="w-full bg-[#f4f1ec] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#5a5a40] h-full" style={{ width: `${(count / checkins.length) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#7a7a60] leading-relaxed">
                Identify stress triggers by adding them during your daily check-in.
              </p>
            )}
          </div>
          
          <div className="border-t border-[#edeae4] pt-4 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9a9a80] mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-sky-500" /> Recent Reflection
            </h4>
            {journals.length > 0 ? (
              <div>
                <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#fdfbf7] text-[#9a9a80] border border-[#e5e1da] mb-1">
                  {journals[0].identifiedEmotion || 'Emotion'}
                </span>
                <p className="text-xs text-[#4a4a35] italic line-clamp-2">
                  "{journals[0].reflection}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#7a7a60] italic">No reflections saved yet.</p>
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}
