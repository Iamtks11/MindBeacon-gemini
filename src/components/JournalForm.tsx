import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { analyzeJournal } from '../lib/api';
import { JournalEntry } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function JournalForm({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [entry, setEntry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.trim()) return;
    
    setSubmitting(true);
    
    try {
      const analysis = await analyzeJournal(entry);

      const journalDoc: JournalEntry = {
        userId: user.uid,
        entry,
        identifiedEmotion: analysis.identifiedEmotion,
        reflection: analysis.reflection,
        followUpQuestion: analysis.followUpQuestion,
        createdAt: Date.now()
      };

      const journalId = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'journals', journalId), journalDoc)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, 'users/journals'));
      
      toast.success("Journal saved.", { description: "We've generated a reflection for you."});
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-sm bg-white rounded-3xl border border-[#edeae4] flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#9a9a80]">Emotional Journal</CardTitle>
        <CardDescription className="hidden">Write down whatever is on your mind. Let it out.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <CardContent className="space-y-4 flex-1">
          <div className="space-y-2 h-full">
            <Label htmlFor="entry" className="sr-only">Your entry</Label>
            <Textarea 
              id="entry" 
              placeholder="How are you feeling about your JEE preparation today?" 
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="resize-none min-h-[300px] w-full bg-[#fdfbf7] rounded-xl p-4 text-sm border-none focus-visible:ring-1 focus-visible:ring-[#5a5a40] placeholder:italic placeholder:text-[#9a9a80] text-[#2d2d2d]"
              aria-label="Journal entry"
            />
          </div>
        </CardContent>
        <CardFooter className="pb-6">
          <Button type="submit" disabled={submitting || !entry.trim()} className="w-full py-6 bg-[#fdfbf7] border border-[#5a5a40] text-[#5a5a40] hover:bg-[#e5e1da]/50 rounded-xl font-bold text-sm">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reflecting...</> : 'Reflect with AI'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
