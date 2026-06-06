import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { analyzeCheckin } from '../lib/api';
import { Checkin } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, Brain, Target, CalendarRange, Layers } from 'lucide-react';

const EXAMS = ['JEE', 'NEET', 'UPSC', 'Board Exams', 'CUET', 'CAT', 'GATE', 'Other'];
const PHASES = ['Preparation Phase', 'Mock Test Season', 'Exam Week', 'Result Season'];
const TRIGGERS = [
  { label: '📚 Syllabus Backlog', val: 'Syllabus Backlog' },
  { label: '📝 Mock Test Scores', val: 'Mock Test Scores' },
  { label: '👥 Peer Pressure', val: 'Peer Pressure' },
  { label: '👨‍👩‍👧 Family Expectations', val: 'Family Expectations' },
  { label: '⏳ Time Management', val: 'Time Management' },
  { label: '💤 Sleep Deprivation', val: 'Sleep Deprivation' },
  { label: '📉 Self-Doubt', val: 'Self-Doubt' },
  { label: '📅 Exam Approaching', val: 'Exam Approaching' },
  { label: '🚪 Future Uncertainty', val: 'Future Uncertainty' }
];

export function CheckinForm({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [study, setStudy] = useState(4);
  const [examType, setExamType] = useState('JEE');
  const [examPhase, setExamPhase] = useState('Preparation Phase');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [concern, setConcern] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTrigger = (val: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );
  };

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // 1. Analyze with Gemini API
      const analysis = await analyzeCheckin({
        mood,
        stress,
        sleep,
        study,
        concern,
        examType,
        examPhase,
        stressTriggers: selectedTriggers
      });
      
      // Calculate Beacon Score (0-100)
      const moodScore = ((mood - 1) / 9) * 100;
      const stressScore = ((10 - stress) / 9) * 100;
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
        examType,
        examPhase,
        stressTriggers: selectedTriggers,
        riskLevel: analysis.riskLevel,
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        createdAt: serverTimestamp() // Set firestore server timestamp for security compliance
      };

      const checkinId = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'checkins', checkinId), checkinDoc)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, 'users/checkins'));
      
      toast.success("Check-in complete!", { description: analysis.summary });
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong during check-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-md bg-[#5a5a40] text-white rounded-3xl border-none overflow-hidden" role="form" aria-label="Daily Check-in Form">
      <CardHeader className="bg-[#4d4d36] pb-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-serif font-bold flex items-center gap-2">
            <Brain className="h-5.5 w-5.5 text-[#d9e0d7]" />
            Daily Check-In
          </CardTitle>
          <span className="text-xs font-semibold px-2 py-1 bg-white/10 rounded-full text-[#d9e0d7]">
            Step {step} of 5
          </span>
        </div>
        <CardDescription className="text-xs text-[#d9e0d7] mt-1">
          Take a moment to reflect on your academic day. We analyze your parameters to help balance study and wellness.
        </CardDescription>
        
        {/* Progress bar */}
        <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
          <div className="bg-[#d9e0d7] h-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }}></div>
        </div>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6 min-h-[320px] flex flex-col justify-center">
          
          {/* STEP 1: Mood & Stress */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-bold font-serif mb-2 text-[#d9e0d7]">How are you feeling mentally?</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-sm font-semibold">Overall Mood: {mood}</Label>
                  <span className="text-xs text-[#d9e0d7]">1 (Poor) to 10 (Great)</span>
                </div>
                <Slider aria-label="Mood" min={1} max={10} step={1} value={[mood]} onValueChange={(v) => setMood(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex justify-between">
                  <Label className="text-sm font-semibold">Stress Level: {stress}</Label>
                  <span className="text-xs text-[#d9e0d7]">1 (Calm) to 10 (Overwhelmed)</span>
                </div>
                <Slider aria-label="Stress" min={1} max={10} step={1} value={[stress]} onValueChange={(v) => setStress(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
              </div>
            </div>
          )}

          {/* STEP 2: Sleep & Study */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-bold font-serif mb-2 text-[#d9e0d7]">Log your daily time allocation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold block">Sleep Hours: {sleep} hr</Label>
                  <Slider aria-label="Sleep" min={0} max={24} step={1} value={[sleep]} onValueChange={(v) => setSleep(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
                  <p className="text-[11px] text-[#d9e0d7] italic">Recommendation: 7-8 hours</p>
                </div>
                <div className="space-y-4">
                  <Label className="text-sm font-semibold block">Study Hours: {study} hr</Label>
                  <Slider aria-label="Study" min={0} max={24} step={1} value={[study]} onValueChange={(v) => setStudy(v[0])} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-[#5a5a40] [&>.relative>.absolute]:bg-white [&>.relative]:bg-white/20" />
                  <p className="text-[11px] text-[#d9e0d7] italic">Self-study and revision time</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Exam Context */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-bold font-serif mb-2 text-[#d9e0d7]">Select your target exam context</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <Label htmlFor="exam-select" className="text-sm font-semibold flex items-center gap-1.5">
                    <Target className="h-4 w-4" /> Target Exam
                  </Label>
                  <select
                    id="exam-select"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/20 p-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    {EXAMS.map((e) => (
                      <option key={e} value={e} className="text-stone-800">{e}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase-select" className="text-sm font-semibold flex items-center gap-1.5">
                    <CalendarRange className="h-4 w-4" /> Exam Season / Phase
                  </Label>
                  <select
                    id="phase-select"
                    value={examPhase}
                    onChange={(e) => setExamPhase(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/20 p-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    {PHASES.map((p) => (
                      <option key={p} value={p} className="text-stone-800">{p}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* STEP 4: Stress Triggers */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-bold font-serif text-[#d9e0d7]">What is causing you stress today?</h3>
              <p className="text-xs text-[#d9e0d7]">Select all that apply to help us track triggers over time.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2" role="group" aria-label="Stress trigger selectors">
                {TRIGGERS.map((trigger) => {
                  const selected = selectedTriggers.includes(trigger.val);
                  return (
                    <button
                      type="button"
                      key={trigger.val}
                      onClick={() => toggleTrigger(trigger.val)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        selected
                          ? 'bg-white text-[#5a5a40] border-white'
                          : 'bg-white/10 text-white border-white/25 hover:bg-white/15'
                      }`}
                      aria-pressed={selected}
                    >
                      {trigger.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Concern & Submit */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-bold font-serif mb-2 text-[#d9e0d7]">Tell us more (Optional)</h3>
              <div className="space-y-2">
                <Label htmlFor="concern" className="text-sm font-semibold">Biggest Academic Concern</Label>
                <Textarea 
                  id="concern" 
                  placeholder="E.g., 'Scoring low in physics mock tests, worrying about syllabus coverage...'" 
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  className="resize-none min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white"
                />
              </div>
            </div>
          )}

        </CardContent>
        
        <CardFooter className="bg-[#4d4d36] py-4 px-6 flex justify-between gap-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrev}
              disabled={submitting}
              className="text-[#d9e0d7] hover:text-white hover:bg-white/10 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-[#d9e0d7] text-[#5a5a40] hover:bg-white font-bold rounded-xl"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#d9e0d7] text-[#5a5a40] hover:bg-white font-bold rounded-xl px-6 active:scale-[0.98] transition-transform"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing with Gemini...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" /> Complete Check-In
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
