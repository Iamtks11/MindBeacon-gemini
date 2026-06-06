import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { CheckinForm } from './components/CheckinForm';
import { Dashboard } from './components/Dashboard';
import { JournalForm } from './components/JournalForm';
import { WeeklyInsights } from './components/WeeklyInsights';
import { Heart, Activity, BookOpen, BarChart3, LogOut } from 'lucide-react';

type View = 'dashboard' | 'checkin' | 'journal' | 'insights';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#fdfbf7]"><p className="text-[#7a7a60]">Loading MindBeacon...</p></div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfbf7] p-4 text-[#2d2d2d]">
        <Card className="w-full max-w-md bg-white border-[#e5e1da] shadow-sm rounded-3xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#5a5a40] text-white shadow-lg shadow-[#5a5a40]/10">
              <Heart className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-serif font-bold tracking-tight text-[#4a4a35]">MindBeacon</CardTitle>
            <CardDescription className="text-[#7a7a60]">Your personal mental wellness companion for competitive exams.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center flex-col gap-4">
            <p className="text-sm text-[#7a7a60] text-center">
              Sign in with Google to securely track your mood, manage stress, and receive AI-guided reflections.
            </p>
            <Button onClick={loginWithGoogle} className="w-full bg-[#5a5a40] hover:bg-[#4a4a35] text-white rounded-xl py-3 font-bold">Sign in with Google</Button>
            <p className="text-xs text-[#9a9a80] text-center italic">
              Disclaimer: This is a wellness tool, not a substitute for professional mental health support.
            </p>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2d2d2d] font-sans pb-20 md:pb-0 font-medium">
      {/* Top Navbar */}
      <header className="sticky top-0 z-10 w-full border-b border-[#e5e1da] bg-white/50 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5a5a40] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#5a5a40]/10">
              <Heart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[#4a4a35]">MindBeacon</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#9a9a80]">Student Pro</p>
              <p className="text-sm font-medium text-[#4a4a35]">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#d9e0d7] border-2 border-white shadow-sm flex items-center justify-center font-bold text-[#5a5a40]">
              {user.email?.[0].toUpperCase() || 'U'}
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-[#7a7a60] hover:text-[#5a5a40] ml-2" title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 md:p-8 md:flex md:gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-48 flex-col gap-2">
          <NavButton view="dashboard" current={view} onClick={setView} icon={<Activity />} label="Dashboard" />
          <NavButton view="checkin" current={view} onClick={setView} icon={<Heart />} label="Daily Check-in" />
          <NavButton view="journal" current={view} onClick={setView} icon={<BookOpen />} label="Journal" />
          <NavButton view="insights" current={view} onClick={setView} icon={<BarChart3 />} label="Weekly Insights" />
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          {view === 'dashboard' && <Dashboard user={user} />}
          {view === 'checkin' && <CheckinForm user={user} onComplete={() => setView('dashboard')} />}
          {view === 'journal' && <JournalForm user={user} onComplete={() => setView('dashboard')} />}
          {view === 'insights' && <WeeklyInsights user={user} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-between border-t border-[#e5e1da] bg-white px-6 md:hidden">
        <MobileNavButton view="dashboard" current={view} onClick={setView} icon={<Activity />} label="Dash" />
        <MobileNavButton view="checkin" current={view} onClick={setView} icon={<Heart />} label="Check-in" />
        <MobileNavButton view="journal" current={view} onClick={setView} icon={<BookOpen />} label="Journal" />
        <MobileNavButton view="insights" current={view} onClick={setView} icon={<BarChart3 />} label="Insights" />
      </nav>
      <Toaster />
    </div>
  );
}

function NavButton({ view, current, onClick, icon, label }: { view: View, current: View, onClick: (v: View) => void, icon: React.ReactNode, label: string }) {
  const active = view === current;
  return (
    <Button 
      variant="ghost"
      className={`justify-start gap-3 rounded-xl ${active ? 'bg-[#d9e0d7] text-[#5a5a40] font-bold' : 'text-[#7a7a60] hover:bg-[#e5e1da]/50 hover:text-[#5a5a40]'}`}
      onClick={() => onClick(view)}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' })}
      {label}
    </Button>
  )
}

function MobileNavButton({ view, current, onClick, icon, label }: { view: View, current: View, onClick: (v: View) => void, icon: React.ReactNode, label: string }) {
  const active = view === current;
  return (
    <button 
      onClick={() => onClick(view)}
      className={`flex flex-col items-center justify-center gap-1 min-w-[64px] ${active ? 'text-[#5a5a40] font-bold' : 'text-[#7a7a60]'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
      <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
    </button>
  )
}
