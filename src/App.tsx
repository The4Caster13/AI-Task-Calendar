import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Target,
  Settings2,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Layers,
  Zap,
  Menu,
  FolderDot,
  LogOut,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Goal as Project, AppState } from './types';
import { cn } from '@/lib/utils';
import { TRANSITION_VIEW } from '@/lib/motion';
import { applyColorTheme } from '@/lib/colorThemes';
import Lenis from 'lenis';

// VIEW IMPORTS
import SettingsView from '@/src/setting';
import DailyTasks from '@/src/daily';
import Dashboard from '@/src/dashboard';
import CalendarView from '@/src/calendar';
import ProjectView from '@/src/ProjectView';
import AIDirector from '@/src/AIDirector';
import MushroomSprite from '@/src/mushroom-sprite';

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const buildInitialState = (): AppState => {
  const focusTaskId = uuid();
  return {
    goals: [
      {
        id: 'proj-1',
        title: '👋 Example Project (delete me!)',
        description: "This sample project shows off every feature — priority tasks, completed tasks, deadlines, and focus tasks. Explore it, then delete it and add your own from the + button.",
        color: '#BC7B6F',
        tasks: [
          { id: uuid(), title: '✅ This is a completed task — nice work!', weight: 2, completed: true, isPriority: false, completedAt: Date.now() - 2 * 60 * 60 * 1000 },
          { id: uuid(), title: '⭐ This is a priority task — it shows up first', weight: 5, completed: false, isPriority: true },
          { id: focusTaskId, title: '📌 This task is pinned to your Focus list (see the Daily view)', weight: 3, completed: false, isPriority: false },
          { id: uuid(), title: '➕ Try adding your own task with the button above', weight: 1, completed: false, isPriority: false },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active',
        deadline: Date.now() + 1000 * 60 * 60 * 24 * 14,
      },
    ],
    tasks: [
      { id: uuid(), title: '🗒️ Tasks don\'t need a project — this one has none', weight: 1, completed: false, isPriority: false },
    ],
    focusTaskIds: [focusTaskId],
    lastActiveDate: new Date().toDateString(),
    settings: { dayStart: 9, dayEnd: 18 },
  };
};

const INITIAL_STATE: AppState = buildInitialState();

// HELPER COMPONENT FOR SIDEBAR BUTTONS
function NavButton({ icon, label, active, isOpen, onClick }: any) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'w-full h-11 rounded-xl font-semibold transition-all flex items-center',
        isOpen ? 'justify-start gap-3 px-3' : 'justify-center px-0',
        active ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'
      )}
    >
      <div className="shrink-0">{icon}</div>
      {isOpen && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="truncate"
        >
          {label}
        </motion.span>
      )}
    </Button>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [resetCode, setResetCode] = useState('');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [zenMode, setZenMode] = useState(() => localStorage.getItem('zen-mode') === 'true');
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    localStorage.setItem('zen-mode', String(zenMode));
  }, [zenMode]);

  useEffect(() => {
    applyColorTheme(state.settings?.colorTheme);
  }, [state.settings?.colorTheme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setIsLoaded(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const loadData = async () => {
      const { data, error } = await supabase.from('user_data').select('state').eq('id', session.user.id).single();
      if (data?.state) setState(data.state as AppState);
      else if (error && error.code === 'PGRST116') {
        await supabase.from('user_data').insert([{ id: session.user.id, state: INITIAL_STATE }]);
        setState(INITIAL_STATE);
      }
      setIsLoaded(true);
    };
    loadData();
  }, [session]);

  useEffect(() => {
    if (!isLoaded || !session?.user) return;
    const saveTimeout = setTimeout(async () => {
      await supabase.from('user_data').update({ state, updated_at: new Date().toISOString() }).eq('id', session.user.id);
    }, 1000);
    return () => clearTimeout(saveTimeout);
  }, [state, isLoaded, session]);

  // Buttery momentum scroll on the main content area, once it's actually mounted.
  useEffect(() => {
    if (!isLoaded || !session?.user) return;
    const wrapper = document.querySelector<HTMLElement>('.dashboard-scroll-area [data-slot="scroll-area-viewport"]');
    if (!wrapper) return;
    const content = wrapper.firstElementChild as HTMLElement | null;
    if (!content) return;

    const lenis = new Lenis({ wrapper, content, duration: 1.1, smoothWheel: true });
    lenisRef.current = lenis;
    let frameId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isLoaded, session]);

  // Jump to the top of the content pane whenever the user switches views
  // (dashboard/daily/calendar/settings/a project), instead of preserving
  // whatever scroll position the previous page was left at.
  useEffect(() => {
    if (!isLoaded || !session?.user) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      return;
    }
    const wrapper = document.querySelector<HTMLElement>('.dashboard-scroll-area [data-slot="scroll-area-viewport"]');
    wrapper?.scrollTo({ top: 0 });
  }, [currentView, isLoaded, session]);

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    const newProject: Project = {
      id: uuid(),
      title: newProjectTitle,
      description: newProjectDesc,
      color: '#BC7B6F',
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
    };
    setState((prev) => ({ ...prev, goals: [...prev.goals, newProject] }));
    setCurrentView(newProject.id);
    setIsCreateModalOpen(false);
    setNewProjectTitle('');
    setNewProjectDesc('');
  };

  const activeProject = useMemo(() => state.goals.find(g => g.id === currentView) || null, [state.goals, currentView]);

  if (!session) {
    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { alert(error.message); return; }
        if (!data.session) alert('Account created! Check your email to confirm your address, then log in.');
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) { alert(error.message); return; }
        alert('Check your email for a verification code.');
        setPassword('');
        setAuthMode('reset');
      } else if (authMode === 'reset') {
        const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: resetCode, type: 'recovery' });
        if (verifyError) { alert(verifyError.message); return; }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) { alert(updateError.message); return; }
        alert('Password updated! You are now logged in.');
        setResetCode('');
        setPassword('');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
      }
    };
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <form onSubmit={handleEmailAuth} className="w-full max-w-sm p-8 bg-card rounded-3xl shadow-xl space-y-4">
          <h1 className="text-2xl font-black text-center">TrueProgress</h1>

          {authMode !== 'reset' && (
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          )}

          {authMode === 'reset' && (
            <Input type="text" placeholder="Verification code" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required />
          )}

          {authMode !== 'forgot' && (
            <Input
              type="password"
              placeholder={authMode === 'reset' ? 'New password' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          <Button type="submit" className="w-full bg-primary text-primary-foreground">
            {authMode === 'signup' ? 'Sign Up' : authMode === 'forgot' ? 'Send Code' : authMode === 'reset' ? 'Reset Password' : 'Log In'}
          </Button>

          {authMode === 'login' && (
            <div className="space-y-2">
              <button type="button" onClick={() => setAuthMode('signup')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                Don't have an account? Sign Up
              </button>
              <button type="button" onClick={() => setAuthMode('forgot')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                Forgot password?
              </button>
            </div>
          )}

          {authMode === 'signup' && (
            <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              Already have an account? Log In
            </button>
          )}

          {(authMode === 'forgot' || authMode === 'reset') && (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setResetCode(''); setPassword(''); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to Log In
            </button>
          )}
        </form>
      </div>
    );
  }

  if (!isLoaded) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-clay border-b-2 border-transparent"></div>
    </div>
  );

  return (
    <TooltipProvider>
      <MushroomSprite />
      <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
        {/* Sidebar (Rail Logic Applied Here) */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className="bg-sidebar border-r border-border flex flex-col relative z-20 shrink-0 overflow-hidden"
        >
          <div className={cn("p-6 flex items-center", isSidebarOpen ? "justify-between" : "justify-center")}>
            <div className="flex items-center gap-3 font-bold text-xl tracking-tight whitespace-nowrap">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  TrueProgress
                </motion.span>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-8 py-4">
              <div className="space-y-1">
                {isSidebarOpen && <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Overview</div>}
                <NavButton icon={<LayoutDashboard className="w-5 h-5" />} label="Global Dashboard" active={currentView === 'dashboard'} isOpen={isSidebarOpen} onClick={() => setCurrentView('dashboard')} />
                <NavButton icon={<Zap className="w-5 h-5" />} label="Daily Tasks" active={currentView === 'daily'} isOpen={isSidebarOpen} onClick={() => setCurrentView('daily')} />
                <NavButton icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" active={currentView === 'calendar'} isOpen={isSidebarOpen} onClick={() => setCurrentView('calendar')} />
              </div>

              <div className="space-y-1">
                {isSidebarOpen && (
                  <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    <span>Projects</span>
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                      <DialogTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded-md"><Plus className="w-3.5 h-3.5" /></button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} placeholder="Title" />
                          <Input value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} placeholder="Description" />
                        </div>
                        <DialogFooter><Button onClick={handleCreateProject} className="w-full bg-primary text-primary-foreground">Create</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {state.goals.map((project) => (
                  <button 
                    key={project.id} 
                    onClick={() => setCurrentView(project.id)} 
                    className={cn(
                      'w-full flex items-center rounded-xl transition-all text-sm font-medium h-11',
                      isSidebarOpen ? 'px-3 gap-3' : 'justify-center',
                      currentView === project.id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <FolderDot className={cn('w-5 h-5 shrink-0', currentView === project.id ? 'text-primary-foreground' : 'text-muted-foreground/70')} />
                    {isSidebarOpen && <span className="truncate flex-1 text-left">{project.title}</span>}
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="p-4">
            <div className="rounded-2xl border border-border p-2 space-y-1">
              <NavButton icon={<Settings2 className="w-5 h-5" />} label="Settings" active={currentView === 'settings'} isOpen={isSidebarOpen} onClick={() => setCurrentView('settings')} />

              {isSidebarOpen ? (
                <div className="flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => supabase.auth.signOut()}
                    className="flex-1 flex items-center gap-2 h-9 px-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive transition-all"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sign Out
                  </button>
                  <div className="relative h-8 rounded-full bg-espresso p-1 flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setZenMode(false)}
                      className="relative px-2.5 flex items-center justify-center text-[11px] font-bold rounded-full"
                    >
                      {!zenMode && (
                        <motion.div
                          layoutId="zen-toggle-pill"
                          className="absolute inset-0 bg-white rounded-full shadow-sm"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className={cn("relative z-10", !zenMode ? "text-clay" : "text-white/90")}>Off</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setZenMode(true)}
                      className="relative px-2.5 flex items-center justify-center text-[11px] font-bold rounded-full"
                    >
                      {zenMode && (
                        <motion.div
                          layoutId="zen-toggle-pill"
                          className="absolute inset-0 bg-white rounded-full shadow-sm"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className={cn("relative z-10", zenMode ? "text-clay" : "text-white/90")}>On</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setZenMode((z) => !z)}
                    className={cn("w-full justify-center transition-all", zenMode ? "text-clay" : "text-muted-foreground hover:text-foreground")}
                  >
                    {zenMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => supabase.auth.signOut()}
                    className="w-full justify-center text-muted-foreground hover:text-destructive transition-all"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-muted/40 h-full">
          <header className="h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-8 justify-between z-10">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-muted-foreground">
                <Menu className="w-5 h-5" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Layers className="w-4 h-4 text-muted-foreground/70" />
                {['dashboard', 'daily', 'calendar', 'settings'].includes(currentView) ? (
                  <span className="font-bold text-foreground capitalize">{currentView.replace('-', ' ')}</span>
                ) : (
                  <>
                    <span className="cursor-pointer hover:text-foreground" onClick={() => setCurrentView('dashboard')}>Projects</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/70" />
                    <span className="font-bold text-foreground">{activeProject?.title || 'Unknown Project'}</span>
                  </>
                )}
              </div>
            </div>
          </header>

          <ScrollArea className="flex-1 dashboard-scroll-area">
            <div className="w-full">
              <AnimatePresence mode="wait">
                {(() => {
                  const view = (() => {
                    if (currentView === 'dashboard') return <Dashboard state={state} setState={setState} zenMode={zenMode} />;
                    if (currentView === 'daily') return <DailyTasks state={state} setState={setState} />;
                    if (currentView === 'calendar') return <CalendarView state={state} setState={setState} />;
                    if (currentView === 'settings') return <SettingsView state={state} setState={setState} />;
                    if (activeProject) return <ProjectView state={state} setState={setState} projectId={currentView} />;
                    return <div className="p-20 text-center text-muted-foreground">Page not found</div>;
                  })();
                  return (
                    <motion.div
                      key={activeProject ? activeProject.id : currentView}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={TRANSITION_VIEW}
                    >
                      {view}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* AI Director — floating chat bubble, available on every page */}
        <AIDirector state={state} setState={setState} />
      </div>
    </TooltipProvider>
  );
}