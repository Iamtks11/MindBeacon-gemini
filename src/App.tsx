import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { CheckinForm } from './components/CheckinForm';
import { Dashboard } from './components/Dashboard';
import { JournalForm } from './components/JournalForm';
import { WeeklyInsights } from './components/WeeklyInsights';
import { MindfulnessRoom } from './components/MindfulnessRoom';
import { SupportResources } from './components/SupportResources';
import { Heart, Activity, BookOpen, BarChart3, LogOut, Sparkles, PhoneCall } from 'lucide-react';
import { Checkin, JournalEntry } from './types';

type View = 'dashboard' | 'checkin' | 'journal' | 'insights' | 'mindfulness' | 'support';

const getSafeMillis = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  return Date.now();
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [isIframe, setIsIframe] = useState(false);

  // In-Memory Shared Cache State to maximize Efficiency and minimize redundant DB reads
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Shared Firestore Realtime Snapshot Listeners (Single connection active per session)
  useEffect(() => {
    if (!user) {
      setCheckins([]);
      setJournals([]);
      setDbLoading(false);
      return;
    }

    setDbLoading(true);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgoDate = new Date(sevenDaysAgo);

    // 1. Checkins listener
    const checkinsQ = query(
      collection(db, 'users', user.uid, 'checkins'),
      where('createdAt', '>=', sevenDaysAgoDate),
      orderBy('createdAt', 'asc')
    );

    const unsubCheckins = onSnapshot(checkinsQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
      data.sort((a, b) => getSafeMillis(a.createdAt) - getSafeMillis(b.createdAt));
      setCheckins(data);
      setDbLoading(false);
    }, (err) => {
      console.warn("Checkins query failed, falling back to simple query", err);
      const fallbackQ = query(
        collection(db, 'users', user.uid, 'checkins'),
        limit(20)
      );
      onSnapshot(fallbackQ, (fallbackSnap) => {
        const data = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
        data.sort((a, b) => getSafeMillis(a.createdAt) - getSafeMillis(b.createdAt));
        setCheckins(data);
        setDbLoading(false);
      });
    });

    // 2. Journals listener
    const journalsQ = query(
      collection(db, 'users', user.uid, 'journals'),
      where('createdAt', '>=', sevenDaysAgoDate),
      orderBy('createdAt', 'desc')
    );

    const unsubJournals = onSnapshot(journalsQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
      data.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt));
      setJournals(data);
    }, (err) => {
      console.warn("Journals query failed, using limit fallback", err);
      const fallbackQ = query(
        collection(db, 'users', user.uid, 'journals'),
        limit(10)
      );
      onSnapshot(fallbackQ, (fallbackSnap) => {
        const data = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
        data.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt));
        setJournals(data);
      });
    });

    return () => {
      unsubCheckins();
      unsubJournals();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup')) {
        toast.error("Popup Blocked", {
          description: "Please enable popups or open this site in a new tab to sign in.",
          duration: 10000,
        });
      } else {
        toast.error("Login Failed", {
          description: err.message || "Failed to authenticate. Please try again.",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfbf7]" role="status" aria-live="polite">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5a5a40] border-t-transparent mx-auto"></div>
          <p className="text-sm font-semibold text-[#7a7a60]">Loading MindBeacon...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] p-4 text-[#2d2d2d]">
        <Card className="w-full max-w-md bg-white border border-[#e5e1da] shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5a5a40] text-white shadow-lg shadow-[#5a5a40]/10">
              <Heart className="h-7 w-7 fill-white" />
            </div>
            <CardTitle className="text-3xl font-serif font-bold tracking-tight text-[#4a4a35]">MindBeacon</CardTitle>
            <CardDescription className="text-[#7a7a60] text-sm mt-1">
              Your personal mental wellness companion for competitive exams.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center flex-col gap-5 px-8 pb-8">
            <p className="text-sm text-[#7a7a60] text-center leading-relaxed">
              Sign in with Google to securely track your mood, identify academic stress triggers, reframe thoughts, and receive exam wellness insights.
            </p>
            <Button onClick={handleLogin} className="w-full bg-[#5a5a40] hover:bg-[#4a4a35] text-white rounded-xl py-6 font-bold shadow-md transition-transform active:scale-[0.98]">
              Sign in with Google
            </Button>
            {isIframe && (
              <div className="text-xs text-[#8f5b24] bg-[#fff9eb] border border-[#ffe099] rounded-xl p-3 leading-relaxed">
                <span className="font-bold">⚠️ Preview Window Mode:</span> Popups may be blocked. If Google login doesn't open, please click the "open in new tab" icon in the upper right.
              </div>
            )}
            <p className="text-[10px] text-[#9a9a80] text-center italic leading-relaxed border-t border-stone-100 pt-4">
              Disclaimer: MindBeacon is a mindfulness support tool and is not a replacement for clinical mental health therapy.
            </p>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2d2d2d] font-sans pb-24 md:pb-8 font-medium">
      {/* Top Navbar */}
      <header className="sticky top-0 z-10 w-full border-b border-[#e5e1da] bg-white/70 backdrop-blur-md" role="banner">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5a5a40] rounded-xl flex items-center justify-center text-white shadow-md">
              <Heart className="h-5.5 w-5.5 fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight text-[#4a4a35]">MindBeacon</h1>
              <span className="hidden sm:block text-[9px] font-bold uppercase tracking-widest text-[#9a9a80] -mt-1">Exam Stress Tracker</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a9a80]">Student Portal</p>
              <p className="text-xs font-semibold text-[#4a4a35]">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#d9e0d7] border-2 border-white shadow-sm flex items-center justify-center font-bold text-[#5a5a40]" aria-hidden="true">
              {user.email?.[0].toUpperCase() || 'S'}
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-[#7a7a60] hover:text-rose-600 ml-1 h-9 w-9 rounded-xl" title="Log out" aria-label="Log out of MindBeacon">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl p-4 md:p-8 md:flex md:gap-8">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-52 flex-col gap-1.5 shrink-0" role="navigation" aria-label="Desktop navigation">
          <NavButton view="dashboard" current={view} onClick={setView} icon={<Activity />} label="Dashboard" />
          <NavButton view="checkin" current={view} onClick={setView} icon={<Heart />} label="Daily Check-in" />
          <NavButton view="journal" current={view} onClick={setView} icon={<BookOpen />} label="CBT Journal" />
          <NavButton view="insights" current={view} onClick={setView} icon={<BarChart3 />} label="Weekly Report" />
          <NavButton view="mindfulness" current={view} onClick={setView} icon={<Sparkles />} label="Breathing Room" />
          <NavButton view="support" current={view} onClick={setView} icon={<PhoneCall />} label="Counseling & Tips" />
        </aside>

        {/* Dynamic Content Window */}
        <div className="flex-1" role="region" aria-live="polite">
          {view === 'dashboard' && (
            <Dashboard 
              checkins={checkins} 
              journals={journals} 
              loading={dbLoading} 
            />
          )}
          {view === 'checkin' && <CheckinForm user={user} onComplete={() => setView('dashboard')} />}
          {view === 'journal' && <JournalForm user={user} onComplete={() => setView('dashboard')} />}
          {view === 'insights' && (
            <WeeklyInsights 
              user={user} 
              checkins={checkins} 
              journals={journals} 
            />
          )}
          {view === 'mindfulness' && <MindfulnessRoom />}
          {view === 'support' && <SupportResources />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around border-t border-[#e5e1da] bg-white px-4 md:hidden" role="navigation" aria-label="Mobile navigation">
        <MobileNavButton view="dashboard" current={view} onClick={setView} icon={<Activity />} label="Dash" />
        <MobileNavButton view="checkin" current={view} onClick={setView} icon={<Heart />} label="Checkin" />
        <MobileNavButton view="journal" current={view} onClick={setView} icon={<BookOpen />} label="Journal" />
        <MobileNavButton view="insights" current={view} onClick={setView} icon={<BarChart3 />} label="Report" />
        <MobileNavButton view="mindfulness" current={view} onClick={setView} icon={<Sparkles />} label="Breathe" />
        <MobileNavButton view="support" current={view} onClick={setView} icon={<PhoneCall />} label="Help" />
      </nav>
      
      <Toaster />
    </div>
  );
}

interface NavBtnProps {
  view: View;
  current: View;
  onClick: (v: View) => void;
  icon: React.ReactNode;
  label: string;
}

function NavButton({ view, current, onClick, icon, label }: NavBtnProps) {
  const active = view === current;
  return (
    <Button 
      variant="ghost"
      className={`justify-start gap-3 rounded-xl py-5 px-4 font-semibold text-sm ${
        active 
          ? 'bg-[#d9e0d7] text-[#5a5a40] font-bold shadow-sm' 
          : 'text-[#7a7a60] hover:bg-stone-100 hover:text-[#5a5a40]'
      }`}
      onClick={() => onClick(view)}
      role="tab"
      aria-selected={active}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 shrink-0' })}
      {label}
    </Button>
  )
}

function MobileNavButton({ view, current, onClick, icon, label }: NavBtnProps) {
  const active = view === current;
  return (
    <button 
      onClick={() => onClick(view)}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[50px] transition-colors py-1 ${
        active ? 'text-[#5a5a40] font-bold' : 'text-[#7a7a60] hover:text-[#5a5a40]'
      }`}
      role="tab"
      aria-selected={active}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'h-4.5 w-4.5' })}
      <span className="text-[9px] uppercase tracking-wider font-semibold">{label}</span>
    </button>
  )
}
