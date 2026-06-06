import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye } from 'lucide-react';

type BreathingPattern = {
  name: string;
  description: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
};

const PATTERNS: BreathingPattern[] = [
  { name: 'Box Breathing (Calming)', description: 'Standard Navy SEAL technique for high stress and exam anxiety.', inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
  { name: '4-7-8 Breathing (Deep Relax)', description: 'Nervous system tranquilizer. Excellent before sleep or results day.', inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
  { name: 'Coherent Breathing (Focus)', description: 'Equal inhale/exhale to optimize heart rate variability and mental focus.', inhale: 5, hold1: 0, exhale: 5, hold2: 0 }
];

export function MindfulnessRoom() {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(PATTERNS[0]);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [timeLeft, setTimeLeft] = useState(selectedPattern.inhale);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound generator using Web Audio API to avoid external asset loading (Efficiency & Independence)
  const playBeep = (freq: number, type: 'sine' | 'triangle' = 'sine', duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context failed', e);
    }
  };

  useEffect(() => {
    // Reset timer when pattern changes
    setIsActive(false);
    setPhase('Inhale');
    setTimeLeft(selectedPattern.inhale);
    setCycleCount(0);
  }, [selectedPattern]);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Switch to next phase
          let nextPhase: typeof phase = 'Inhale';
          let nextTime = 0;

          if (phase === 'Inhale') {
            if (selectedPattern.hold1 > 0) {
              nextPhase = 'Hold';
              nextTime = selectedPattern.hold1;
              playBeep(440, 'sine', 0.2); // Medium pitch beep for Hold
            } else {
              nextPhase = 'Exhale';
              nextTime = selectedPattern.exhale;
              playBeep(330, 'triangle', 0.2); // Low pitch beep for Exhale
            }
          } else if (phase === 'Hold') {
            nextPhase = 'Exhale';
            nextTime = selectedPattern.exhale;
            playBeep(330, 'triangle', 0.2);
          } else if (phase === 'Exhale') {
            if (selectedPattern.hold2 > 0) {
              nextPhase = 'Rest';
              nextTime = selectedPattern.hold2;
              playBeep(220, 'sine', 0.1); // Low beep for post-exhale rest
            } else {
              nextPhase = 'Inhale';
              nextTime = selectedPattern.inhale;
              setCycleCount((c) => c + 1);
              playBeep(523.25, 'sine', 0.3); // High pitch C5 beep for fresh breath
            }
          } else if (phase === 'Rest') {
            nextPhase = 'Inhale';
            nextTime = selectedPattern.inhale;
            setCycleCount((c) => c + 1);
            playBeep(523.25, 'sine', 0.3);
          }

          setPhase(nextPhase);
          return nextTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phase, selectedPattern, soundEnabled]);

  const handleStartStop = () => {
    if (!isActive) {
      setIsActive(true);
      playBeep(523.25, 'sine', 0.3); // High start beep
    } else {
      setIsActive(false);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setPhase('Inhale');
    setTimeLeft(selectedPattern.inhale);
    setCycleCount(0);
  };

  // Determine scale of breathing circle based on current phase
  let circleScale = 0.5; // default Rest/Start
  if (isActive) {
    if (phase === 'Inhale') {
      // Scale from 0.5 to 1.0 depending on time elapsed
      const progress = 1 - (timeLeft / selectedPattern.inhale);
      circleScale = 0.5 + progress * 0.5;
    } else if (phase === 'Hold') {
      circleScale = 1.0;
    } else if (phase === 'Exhale') {
      // Scale from 1.0 to 0.5 depending on time elapsed
      const progress = 1 - (timeLeft / selectedPattern.exhale);
      circleScale = 1.0 - progress * 0.5;
    } else if (phase === 'Rest') {
      circleScale = 0.5;
    }
  }

  // Phase color theme and instruction
  const getPhaseConfig = () => {
    switch (phase) {
      case 'Inhale':
        return { text: 'Breathe In', sub: 'Fill your lungs slowly', color: 'bg-emerald-500/25 border-emerald-400' };
      case 'Hold':
        return { text: 'Hold', sub: 'Retain your breath gently', color: 'bg-amber-500/25 border-amber-400' };
      case 'Exhale':
        return { text: 'Breathe Out', sub: 'Let all stress go', color: 'bg-sky-500/25 border-sky-400' };
      case 'Rest':
        return { text: 'Hold Empty', sub: 'Rest your mind', color: 'bg-stone-500/25 border-stone-400' };
    }
  };

  const currentConfig = getPhaseConfig();

  return (
    <Card className="max-w-2xl mx-auto border border-[#edeae4] bg-white rounded-3xl shadow-sm overflow-hidden" role="region" aria-label="Mindfulness and Breathing Room">
      <CardHeader className="bg-[#fcfbf9] border-b border-[#f0eee8] px-6 py-5">
        <CardTitle className="text-xl font-serif font-bold text-[#4a4a35] flex items-center gap-2">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
          </span>
          Mindfulness Breathing Room
        </CardTitle>
        <CardDescription className="text-sm text-[#7a7a60]">
          Take a 2-minute break from study backlogs. Slow down your heart rate and ease anxiety.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 flex flex-col items-center">
        {/* Breathing Pattern Selector */}
        <div className="w-full flex flex-col gap-2 mb-8">
          <label htmlFor="pattern-selector" className="text-xs font-bold uppercase tracking-wider text-[#9a9a80]">Choose Technique</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2" id="pattern-selector" role="radiogroup">
            {PATTERNS.map((p) => {
              const selected = selectedPattern.name === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => setSelectedPattern(p)}
                  className={`p-3 rounded-2xl text-left transition-all border text-sm flex flex-col justify-between ${
                    selected
                      ? 'border-[#5a5a40] bg-[#5a5a40]/5 text-[#5a5a40] font-semibold'
                      : 'border-[#edeae4] hover:bg-stone-50 text-stone-600'
                  }`}
                  role="radio"
                  aria-checked={selected}
                >
                  <span className="font-bold block mb-1">{p.name}</span>
                  <span className="text-[11px] leading-relaxed text-[#7a7a60] font-normal">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The Breathing Circle Interface */}
        <div className="relative flex h-72 w-72 items-center justify-center mb-8 bg-stone-50 rounded-full border border-stone-100">
          {/* Pulsing Glow Rings */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className={`absolute rounded-full border-2 ${currentConfig.color} w-64 h-64`}
                initial={{ scale: 0.8, opacity: 0.1 }}
                animate={{ scale: circleScale * 1.05, opacity: 0.3 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>

          {/* Core Breathing Circle */}
          <motion.div
            className={`flex items-center justify-center rounded-full border-4 shadow-xl shadow-stone-100 ${
              isActive ? 'bg-[#5a5a40] text-white border-white' : 'bg-stone-200 text-[#7a7a60] border-transparent'
            } w-52 h-52`}
            animate={{ scale: circleScale }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          >
            <div className="text-center px-4">
              <span className="block text-2xl font-serif font-bold tracking-tight mb-1">
                {isActive ? currentConfig.text : 'Ready'}
              </span>
              {isActive && (
                <>
                  <span className="block text-4xl font-extrabold my-2 tabular-nums" aria-live="polite">
                    {timeLeft}
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest text-white/70">
                    {currentConfig.sub}
                  </span>
                </>
              )}
              {!isActive && (
                <span className="text-xs uppercase tracking-widest text-[#7a7a60]">
                  Click Start
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats and Controls */}
        <div className="w-full flex items-center justify-between border-t border-[#f0eee8] pt-6 gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={soundEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute guidance sounds' : 'Unmute guidance sounds'}
              aria-label={soundEnabled ? 'Mute guidance sounds' : 'Unmute guidance sounds'}
              className={`rounded-xl h-10 w-10 ${
                soundEnabled ? 'bg-[#5a5a40] text-white hover:bg-[#4a4a35]' : 'border-[#edeae4] text-[#7a7a60]'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
            </Button>
            <span className="text-xs text-[#7a7a60]">
              Cycles: <span className="font-bold text-[#4a4a35]">{cycleCount}</span>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!isActive && cycleCount === 0 && phase === 'Inhale'}
              className="rounded-xl border-[#edeae4] text-[#7a7a60] hover:bg-stone-50 h-10 px-4 font-semibold text-sm flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button
              onClick={handleStartStop}
              className={`rounded-xl px-6 h-10 font-bold text-sm text-white flex items-center gap-2 ${
                isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#5a5a40] hover:bg-[#4a4a35]'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="h-4 w-4 fill-white" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" /> Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
