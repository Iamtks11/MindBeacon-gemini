import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, setDoc, doc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { analyzeWeekly } from '../lib/api';
import { WeeklyInsight, Checkin, JournalEntry } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function WeeklyInsights({ user }: { user: User }) {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchLatestInsight();
  }, [user.uid]);

  const fetchLatestInsight = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'insights'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setInsight(snap.docs[0].data() as WeeklyInsight);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users/insights');
    } finally {
       setLoading(false);
    }
  };

  const generateInsight = async () => {
    setGenerating(true);
    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      // Fetch data
      const checkinsQ = query(collection(db, 'users', user.uid, 'checkins'), where('createdAt', '>=', sevenDaysAgo));
      const journalsQ = query(collection(db, 'users', user.uid, 'journals'), where('createdAt', '>=', sevenDaysAgo));
      
      const [checkinsSnap, journalsSnap] = await Promise.all([getDocs(checkinsQ), getDocs(journalsQ)]);
      
      const checkins = checkinsSnap.docs.map(d => d.data() as Checkin);
      const journals = journalsSnap.docs.map(d => d.data() as JournalEntry);
      
      if (checkins.length === 0 && journals.length === 0) {
        toast.error("Not enough data to generate an insight. Please complete check-ins first.");
        setGenerating(false);
        return;
      }

      // Prepare payload
      const payload = {
        checkins: checkins.map(c => ({ mood: c.mood, stress: c.stress, sleep: c.sleep, study: c.study, concern: c.concern })),
        journalEmotions: journals.map(j => j.identifiedEmotion).filter(Boolean)
      };

      const analysis = await analyzeWeekly(payload);

      const newInsight: WeeklyInsight = {
        userId: user.uid,
        averageMood: analysis.averageMood,
        topStressTriggers: analysis.topStressTriggers || [],
        positiveTrend: analysis.positiveTrend,
        burnoutRisk: analysis.burnoutRisk || 'low',
        startDate: sevenDaysAgo,
        endDate: Date.now(),
        createdAt: Date.now()
      };

      const insightId = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'insights', insightId), newInsight)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, 'users/insights'));
      
      setInsight(newInsight);
      toast.success("Weekly insight generated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate insights.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
     return <div className="text-[#9a9a80] animate-pulse">Loading insights...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-[#edeae4] shadow-sm">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#4a4a35]">Weekly Summary Report</h2>
          <p className="text-sm text-[#7a7a60]">AI analysis of your latest check-ins and reflections.</p>
        </div>
        <Button onClick={generateInsight} disabled={generating} className="bg-[#5a5a40] hover:bg-[#4a4a35] text-white rounded-xl">
           {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Generate New'}
        </Button>
      </div>

      {insight ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Burnout Risk */}
          <Card className={`shadow-sm rounded-3xl border-l-4 ${
            insight.burnoutRisk === 'high' ? 'border-l-rose-500' :
            insight.burnoutRisk === 'medium' ? 'border-l-orange-500' :
            'border-l-[#5a5a40]'
          } border-y-[#edeae4] border-r-[#edeae4] bg-white`}>
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#9a9a80]">
                 <AlertTriangle className={`h-4 w-4 ${
                    insight.burnoutRisk === 'high' ? 'text-rose-500' :
                    insight.burnoutRisk === 'medium' ? 'text-orange-500' :
                    'text-[#5a5a40]'
                 }`} />
                 Burnout Risk
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-2xl font-semibold capitalize text-[#2d2d2d] mb-1">{insight.burnoutRisk}</p>
               <p className="text-sm text-[#7a7a60]">Based on recent stress and sleep patterns.</p>
             </CardContent>
          </Card>

          {/* Average Mood */}
          <Card className="shadow-sm rounded-3xl border border-[#edeae4] bg-white">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#9a9a80]">
                 <Zap className="h-4 w-4 text-amber-500" />
                 Average Mood
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-lg font-medium text-[#4a4a35] capitalize">{insight.averageMood}</p>
             </CardContent>
          </Card>

          {/* Positive Trend */}
          <Card className="md:col-span-2 shadow-sm rounded-3xl border border-[#e5e1da] bg-[#f4f1ec]">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5a5a40]">
                 <TrendingUp className="h-4 w-4 text-[#5a5a40]" />
                 Positive Trend
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-[#4a4a35] leading-relaxed font-medium">{insight.positiveTrend}</p>
             </CardContent>
          </Card>

          {/* Top Stress Triggers */}
          {insight.topStressTriggers && insight.topStressTriggers.length > 0 && (
            <Card className="md:col-span-2 shadow-sm rounded-3xl border border-[#edeae4] bg-white">
               <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#9a9a80]">Top Stress Triggers</CardTitle>
                 <CardDescription className="text-[#7a7a60]">Common themes identified in your journals and concerns.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="flex flex-wrap gap-2">
                   {insight.topStressTriggers.map((trigger, idx) => (
                     <span key={idx} className="inline-flex items-center rounded-full bg-[#fdfbf7] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#9a9a80] border border-[#e5e1da]">
                       {trigger}
                     </span>
                   ))}
                 </div>
               </CardContent>
            </Card>
          )}
          
          <div className="md:col-span-2 text-xs text-[#9a9a80] text-center mt-4">
            Report generated on {format(new Date(insight.createdAt), 'MMMM do, yyyy h:mm a')}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center shadow-sm rounded-3xl border-dashed border-[#edeae4] bg-[#fdfbf7]">
          <p className="text-[#9a9a80] mb-4">You have not generated a weekly insight yet. Complete a few daily check-ins and journals, then generate your first insight.</p>
        </Card>
      )}
    </div>
  );
}
