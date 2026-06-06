import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { analyzeCheckin } from '../lib/api';
import { Checkin } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function CheckinForm({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [study, setStudy] = useState(4);
  const [concern, setConcern] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // 1. Analyze with Gemini
      const analysis = await analyzeCheckin({ mood, stress, sleep, study, concern });
      
      // Calculate Beacon Score (0-100)
      // Good constraints: high mood, low stress, optimal sleep, optimal study
      const moodScore = (mood / 10) * 100;
      const stressScore = ((10 - stress) / 10) * 100;
      const sleepScore = sleep >= 7 && sleep <= 9 ? 100 : (sleep < 7 ? (sleep / 7) * 100 : ((24 - sleep) / 15) * 100);
      const studyScore = study >= 2 && study <= 8 ? 100 : (study < 2 ? (study / 2) * 100 : ((24 - study) / 16) * 100);
      const beaconScore = Math.round((moodScore + stressScore + sleepScore + studyScore) / 4);

      const checkinDoc: Checkin = {
        userId: user.uid,
        mood,
        stress,
        sleep,
        study,
        concern,
        beaconScore,
        riskLevel: analysis.riskLevel,
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        createdAt: Date.now()
      };

      const checkinId = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'checkins', checkinId), checkinDoc)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, 'users/checkins'));
      
      toast.success("Check-in complete!", { description: analysis.summary });
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-sm bg-[#5a5a40] text-white rounded-3xl border-none">
      <CardHeader>
        <CardTitle className="text-2xl font-serif font-bold">Daily Check-In</CardTitle>
        <CardDescription className="text-[#d9e0d7]">Take a moment to reflect on how you're doing today.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-base text-white">Overall Mood: {mood}</Label>
              <span className="text-xs text-[#d9e0d7]">1 (Poor) to 10 (Great)</span>
            </div>
            <Slider aria-label="Mood" min={1} max={10} step={1} value={[mood]} onValueChange={(v) => setMood(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-base text-white">Stress Level: {stress}</Label>
              <span className="text-xs text-[#d9e0d7]">1 (Calm) to 10 (Overwhelmed)</span>
            </div>
            <Slider aria-label="Stress" min={1} max={10} step={1} value={[stress]} onValueChange={(v) => setStress(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-base text-white">Sleep Hours: {sleep} hr</Label>
              <Slider aria-label="Sleep" min={0} max={24} step={1} value={[sleep]} onValueChange={(v) => setSleep(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
            </div>
            <div className="space-y-3">
              <Label className="text-base text-white">Study Hours: {study} hr</Label>
              <Slider aria-label="Study" min={0} max={24} step={1} value={[study]} onValueChange={(v) => setStudy(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="concern" className="text-base text-white">Biggest Concern (Optional)</Label>
            <Textarea 
              id="concern" 
              placeholder="What's bothering you the most today? E.g., 'Behind on physics syllabus...'" 
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              className="resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting} className="w-full bg-[#d9e0d7] text-[#5a5a40] hover:bg-white font-bold rounded-xl py-3 active:scale-[0.98] transition-transform">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Complete Check-In'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
