import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, getDocs, setDoc, doc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { analyzeWeekly } from '../lib/api';
import { WeeklyInsight, Checkin, JournalEntry } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, Zap, TrendingUp, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const getSafeMillis = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  return Date.now();
};

interface WeeklyInsightsProps {
  user: User;
  checkins: Checkin[];
  journals: JournalEntry[];
}

export function WeeklyInsights({ user, checkins, journals }: WeeklyInsightsProps) {
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
      console.warn("Insights query error, falling back to simple query", err);
      const fallbackQ = query(
        collection(db, 'users', user.uid, 'insights'),
        limit(10)
      );
      const snap = await getDocs(fallbackQ);
      if (!snap.empty) {
        const data = snap.docs.map(d => d.data() as WeeklyInsight);
        data.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt));
        setInsight(data[0]);
      }
    } finally {
       setLoading(false);
    }
  };

  const generateInsight = async () => {
    setGenerating(true);
    try {
      if (checkins.length === 0 && journals.length === 0) {
        toast.error("Not enough data to generate an weekly report.", {
          description: "Please complete at least one daily check-in or journal entry first."
        });
        setGenerating(false);
        return;
      }

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Prepare payload with all exam context and triggers from props
      const payload = {
        checkins: checkins.map(c => ({
          mood: c.mood,
          stress: c.stress,
          sleep: c.sleep,
          study: c.study,
          concern: c.concern || '',
          examType: c.examType || '',
          examPhase: c.examPhase || '',
          stressTriggers: c.stressTriggers || []
        })),
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
        createdAt: serverTimestamp() // Firestore security rules compliance
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
     return (
       <div className="flex flex-col gap-4 max-w-3xl mx-auto" role="status" aria-busy="true">
         <div className="h-24 bg-stone-100 rounded-3xl animate-pulse" />
         <div className="grid gap-4 md:grid-cols-2">
           <div className="h-32 bg-stone-100 rounded-3xl animate-pulse" />
           <div className="h-32 bg-stone-100 rounded-3xl animate-pulse" />
         </div>
       </div>
     );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" role="region" aria-label="Weekly Insights Report">
      
      {/* Header card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#edeae4] shadow-sm">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#4a4a35]">Weekly Summary Report</h2>
          <p className="text-sm text-[#7a7a60]">AI cognitive analysis of your study habits, sleep, and emotional trends.</p>
        </div>
        <Button onClick={generateInsight} disabled={generating} className="bg-[#5a5a40] hover:bg-[#4a4a35] text-white rounded-xl py-5 px-6 font-bold shadow-sm shrink-0">
           {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Generate Report'}
        </Button>
      </div>

      {insight ? (
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Burnout Risk Card */}
          <Card className={`shadow-sm rounded-3xl border-l-4 ${
            insight.burnoutRisk === 'high' ? 'border-l-rose-500' :
            insight.burnoutRisk === 'medium' ? 'border-l-amber-500' :
            'border-l-emerald-600'
          } border-y-[#edeae4] border-r-[#edeae4] bg-white`}>
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9a9a80]">
                 <AlertTriangle className={`h-4.5 w-4.5 ${
                    insight.burnoutRisk === 'high' ? 'text-rose-500' :
                    insight.burnoutRisk === 'medium' ? 'text-amber-500' :
                    'text-emerald-600'
                 }`} />
                 Burnout Assessment
               </CardTitle>
             </CardHeader>
             <CardContent>
               <span className={`text-2xl font-bold font-serif capitalize ${
                  insight.burnoutRisk === 'high' ? 'text-rose-600' :
                  insight.burnoutRisk === 'medium' ? 'text-amber-600' :
                  'text-emerald-700'
               }`}>
                 {insight.burnoutRisk} Risk
               </span>
               <p className="text-xs text-[#7a7a60] mt-1.5 leading-relaxed font-medium">
                 Calculated by analyzing consistency in study workloads versus sleep hours during your recent exam preparation.
               </p>
             </CardContent>
          </Card>

          {/* Average Mood Card */}
          <Card className="shadow-sm rounded-3xl border border-[#edeae4] bg-white">
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9a9a80]">
                 <Zap className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                 Dominant Mood Theme
               </CardTitle>
             </CardHeader>
             <CardContent>
               <span className="text-xl font-bold font-serif text-[#4a4a35] capitalize">
                 {insight.averageMood}
               </span>
               <p className="text-xs text-[#7a7a60] mt-2 leading-relaxed font-medium">
                 Summarized emotional tone derived from your recent journal reflections and mood logs.
               </p>
             </CardContent>
          </Card>

          {/* Positive Trend Card */}
          <Card className="md:col-span-2 shadow-sm rounded-3xl border border-[#e5e1da] bg-[#f4f1ec]">
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5a5a40]">
                 <TrendingUp className="h-4.5 w-4.5 text-[#5a5a40]" />
                 Observed Strengths & Positive Trends
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-[#4a4a35] leading-relaxed text-sm font-medium">
                 {insight.positiveTrend}
               </p>
             </CardContent>
          </Card>

          {/* Top Stress Triggers */}
          {insight.topStressTriggers && insight.topStressTriggers.length > 0 && (
            <Card className="md:col-span-2 shadow-sm rounded-3xl border border-[#edeae4] bg-white">
               <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9a9a80] flex items-center gap-1.5">
                   <AlertCircle className="h-4 w-4 text-[#7a7a60]" />
                   Identified Stress Triggers
                 </CardTitle>
                 <CardDescription className="text-xs text-[#7a7a60]">Themes requiring mindfulness management</CardDescription>
               </CardHeader>
               <CardContent className="pt-2">
                 <div className="flex flex-wrap gap-2">
                   {insight.topStressTriggers.map((trigger, idx) => (
                     <span key={idx} className="inline-flex items-center rounded-full bg-[#fdfbf7] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#5a5a40] border border-[#edeae4]">
                       {trigger}
                     </span>
                   ))}
                 </div>
               </CardContent>
            </Card>
          )}
          
          <div className="md:col-span-2 text-[10px] text-[#9a9a80] text-center mt-2" aria-live="polite">
            Report generated on {format(new Date(getSafeMillis(insight.createdAt)), 'MMMM do, yyyy h:mm a')}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center shadow-sm rounded-3xl border-dashed border-[#edeae4] bg-[#fdfbf7]">
          <p className="text-sm text-[#7a7a60] font-medium max-w-md mx-auto leading-relaxed">
            You do not have a weekly wellness report yet. Complete daily check-ins and emotional journal logs, then click "Generate Report" above.
          </p>
        </Card>
      )}
    </div>
  );
}
