import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { analyzeJournal } from '../lib/api';
import { JournalEntry } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, BrainCircuit, AlertCircle, Quote } from 'lucide-react';

export function JournalForm({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [entry, setEntry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.trim()) return;
    
    setSubmitting(true);
    
    try {
      // 1. Analyze Journal using backend endpoint (powered by Gemini)
      const analysis = await analyzeJournal(entry);

      const journalDoc: JournalEntry = {
        userId: user.uid,
        entry,
        identifiedEmotion: analysis.identifiedEmotion,
        reflection: analysis.reflection,
        followUpQuestion: analysis.followUpQuestion,
        createdAt: serverTimestamp() // Firestore security rules compliance
      };

      const journalId = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'journals', journalId), journalDoc)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, 'users/journals'));
      
      toast.success("Journal saved.", { description: "AI reflection generated successfully."});
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save and analyze journal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-sm bg-white rounded-3xl border border-[#edeae4] flex flex-col" role="region" aria-label="Emotional Journal Entry Form">
      <CardHeader className="bg-[#fcfbf9] border-b border-[#f0eee8] px-6 py-5">
        <CardTitle className="text-lg font-serif font-bold text-[#4a4a35] flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-[#5a5a40]" />
          CBT Journal & Emotional Reframing
        </CardTitle>
        <CardDescription className="text-xs text-[#7a7a60]">
          Write down whatever is on your mind regarding mock test stress, backlogs, or exam anxiety. Let it out. Our AI will help identify cognitive distortions and offer reframing guidance.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <CardContent className="p-6 space-y-4 flex-1">
          <div className="space-y-2 h-full">
            <Label htmlFor="journal-entry" className="text-xs font-bold uppercase tracking-wider text-[#9a9a80]">Write Your Mind</Label>
            <Textarea 
              id="journal-entry" 
              placeholder="How are you feeling about your studies and exam preparation today? For example, 'I scored poorly in my mock test and I feel like I will never clear JEE...'" 
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              maxLength={5000}
              className="resize-none min-h-[260px] w-full bg-[#fdfbf7] rounded-2xl p-4 text-sm border border-[#edeae4] focus-visible:ring-1 focus-visible:ring-[#5a5a40] placeholder:italic placeholder:text-[#9a9a80] text-[#2d2d2d] leading-relaxed"
              aria-label="Write your journal entry here"
              aria-required="true"
            />
            <div className="flex justify-between items-center text-[10px] text-[#9a9a80] px-1">
              <span>Supports up to 5000 characters</span>
              <span aria-live="polite">{entry.length} / 5000</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pb-6 px-6">
          <Button 
            type="submit" 
            disabled={submitting || !entry.trim()} 
            className="w-full py-5 bg-[#5a5a40] hover:bg-[#4a4a35] text-white rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Distortions & Reflecting...
              </>
            ) : (
              'Save & Reflect with AI'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
