import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, BookOpen, Clock, Heart, ShieldAlert, Sparkles, Brain } from 'lucide-react';

export function SupportResources() {
  const helplines = [
    {
      name: 'Tele-MANAS (Govt. of India)',
      contact: '14416 or 1800-891-4416',
      availability: '24/7 Toll-free',
      description: 'Comprehensive, mental health care service initiated by Ministry of Health, Government of India.'
    },
    {
      name: 'Vandrevala Foundation',
      contact: '+91 9999 666 555',
      availability: '24/7 support',
      description: 'Free, immediate emotional counseling for students dealing with academic distress or depression.'
    },
    {
      name: 'Kiran Helpline',
      contact: '1800-599-0019',
      availability: '24/7 Toll-free',
      description: 'Mental health rehabilitation helpline by the Ministry of Social Justice and Empowerment.'
    },
    {
      name: 'AASRA Helpline',
      contact: '+91 98204 66726',
      availability: '24/7 support',
      description: 'Voluntary organization providing crisis intervention and suicide prevention support.'
    }
  ];

  const studyTips = [
    {
      title: 'The Pomodoro Method (25/5)',
      description: 'Study with intense focus for 25 minutes, then take a hard 5-minute break. This prevents cognitive fatigue and brain burnout.',
      icon: <Clock className="text-amber-500 h-5 w-5" />
    },
    {
      title: 'The 20-20-20 Eye Rule',
      description: 'Every 20 minutes spent looking at a book/screen, look at something 20 feet away for at least 20 seconds. Reduces physical exam strain.',
      icon: <BookOpen className="text-emerald-500 h-5 w-5" />
    },
    {
      title: 'Hydration & Nutrition Boost',
      description: 'Dehydration reduces cognitive efficiency by up to 15%. Keep a water bottle at your desk and opt for nuts/fruits over sugary drinks.',
      icon: <Sparkles className="text-blue-500 h-5 w-5" />
    },
    {
      title: 'Cognitive Reframing',
      description: 'Remind yourself: "An exam determines a score, not my worth as a person." Separate your self-esteem from mocks and exam outcomes.',
      icon: <Brain className="text-purple-500 h-5 w-5" />
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8" role="region" aria-label="Wellness and Student Support Resources">
      {/* Introduction Banner */}
      <div className="bg-[#5a5a40] text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-md">
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <Heart className="h-3.5 w-3.5 fill-white" /> Wellness Toolkit
          </span>
          <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">Academic Stress & Wellness Center</h2>
          <p className="text-sm md:text-base text-[#d9e0d7] max-w-2xl leading-relaxed">
            Preparing for exams like JEE, NEET, and board exams is a marathon, not a sprint. Take care of your mind to optimize your learning.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Support Helplines */}
        <Card className="border border-[#edeae4] bg-white rounded-3xl shadow-sm">
          <CardHeader className="bg-[#fcfbf9] border-b border-[#f0eee8] px-6 py-5">
            <CardTitle className="text-lg font-serif font-bold text-[#4a4a35] flex items-center gap-2">
              <ShieldAlert className="text-rose-500 h-5 w-5" />
              Immediate Help & Counseling
            </CardTitle>
            <CardDescription className="text-xs text-[#7a7a60]">
              If you feel overwhelmed, talk to a trained counselor. These services are anonymous and free.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 divide-y divide-[#f0eee8]">
            {helplines.map((h, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0 space-y-1">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <h4 className="font-bold text-sm text-[#4a4a35]">{h.name}</h4>
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-100">
                    {h.availability}
                  </span>
                </div>
                <p className="text-sm font-semibold text-rose-600 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {h.contact}
                </p>
                <p className="text-xs text-[#7a7a60] leading-relaxed pt-1">
                  {h.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Study Break Hacks */}
        <Card className="border border-[#edeae4] bg-white rounded-3xl shadow-sm">
          <CardHeader className="bg-[#fcfbf9] border-b border-[#f0eee8] px-6 py-5">
            <CardTitle className="text-lg font-serif font-bold text-[#4a4a35] flex items-center gap-2">
              <BookOpen className="text-[#5a5a40] h-5 w-5" />
              Productive & Healthy Study Habits
            </CardTitle>
            <CardDescription className="text-xs text-[#7a7a60]">
              Incorporate these simple habits into your daily revision routine to maximize retention.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {studyTips.map((tip, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="p-2.5 bg-stone-50 border border-stone-100 rounded-xl shrink-0">
                  {tip.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#4a4a35]">{tip.title}</h4>
                  <p className="text-xs text-[#7a7a60] leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
