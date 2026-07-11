import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import React, { useState, useEffect, useMemo } from 'react';
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

const INITIAL_STATE: AppState = {
  goals: [
    {
      id: 'proj-1',
      title: '3D Architectural Portfolio',
      description: 'Build an explorable building structure using Three.js',
      color: '#5b4be0',
      tasks: [
        { id: uuid(), title: 'Setup base Three.js scene and camera', weight: 3, completed: true, isPriority: false, completedAt: Date.now() - 86400000 },
        { id: uuid(), title: 'Model dark matte architectural panels', weight: 5, completed: false, isPriority: true },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      deadline: Date.now() + 1000 * 60 * 60 * 24 * 14,
    },
  ],
  focusTaskIds: [],
  lastActiveDate: new Date().toDateString(),
  settings: { dayStart: 9, dayEnd: 18 },
};

// HELPER COMPONENT FOR SIDEBAR BUTTONS
function NavButton({ icon, label, active, isOpen, onClick }: any) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'w-full h-11 rounded-xl font-semibold transition-all flex items-center',
        isOpen ? 'justify-start gap-3 px-3' : 'justify-center px-0',
        active ? 'bg-black text-white shadow-md' : 'text-[#495057] hover:bg-[#F1F3F5]'
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

  useEffect(() => {
    localStorage.setItem('zen-mode', String(zenMode));
  }, [zenMode]);

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
    let frameId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [isLoaded, session]);

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    const newProject: Project = {
      id: uuid(),
      title: newProjectTitle,
      description: newProjectDesc,
      color: '#5b4be0',
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
      <div className="flex items-center justify-center h-screen bg-[#F8F9FA]">
        <form onSubmit={handleEmailAuth} className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-xl space-y-4">
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

          <Button type="submit" className="w-full bg-black">
            {authMode === 'signup' ? 'Sign Up' : authMode === 'forgot' ? 'Send Code' : authMode === 'reset' ? 'Reset Password' : 'Log In'}
          </Button>

          {authMode === 'login' && (
            <div className="space-y-2">
              <button type="button" onClick={() => setAuthMode('signup')} className="w-full text-center text-sm text-gray-500 hover:text-black">
                Don't have an account? Sign Up
              </button>
              <button type="button" onClick={() => setAuthMode('forgot')} className="w-full text-center text-sm text-gray-500 hover:text-black">
                Forgot password?
              </button>
            </div>
          )}

          {authMode === 'signup' && (
            <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-sm text-gray-500 hover:text-black">
              Already have an account? Log In
            </button>
          )}

          {(authMode === 'forgot' || authMode === 'reset') && (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setResetCode(''); setPassword(''); }}
              className="w-full text-center text-sm text-gray-500 hover:text-black"
            >
              Back to Log In
            </button>
          )}
        </form>
      </div>
    );
  }

  if (!isLoaded) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 border-b-2 border-transparent"></div>
    </div>
  );

  return (
    <TooltipProvider>
      <MushroomSprite />
      <div className="flex h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans overflow-hidden">
        {/* Sidebar (Rail Logic Applied Here) */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className="bg-white border-r border-[#E9ECEF] flex flex-col relative z-20 shrink-0 overflow-hidden"
        >
          <div className={cn("p-6 flex items-center", isSidebarOpen ? "justify-between" : "justify-center")}>
            <div className="flex items-center gap-3 font-bold text-xl tracking-tight whitespace-nowrap">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-white" />
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
                {isSidebarOpen && <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">Overview</div>}
                <NavButton icon={<LayoutDashboard className="w-5 h-5" />} label="Global Dashboard" active={currentView === 'dashboard'} isOpen={isSidebarOpen} onClick={() => setCurrentView('dashboard')} />
                <NavButton icon={<Zap className="w-5 h-5" />} label="Daily Tasks" active={currentView === 'daily'} isOpen={isSidebarOpen} onClick={() => setCurrentView('daily')} />
                <NavButton icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" active={currentView === 'calendar'} isOpen={isSidebarOpen} onClick={() => setCurrentView('calendar')} />
                <NavButton icon={<Settings2 className="w-5 h-5" />} label="Settings" active={currentView === 'settings'} isOpen={isSidebarOpen} onClick={() => setCurrentView('settings')} />
              </div>

              <div className="space-y-1">
                {isSidebarOpen && (
                  <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">
                    <span>Projects</span>
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                      <DialogTrigger asChild>
                        <button className="p-1 hover:bg-[#F1F3F5] rounded-md"><Plus className="w-3.5 h-3.5" /></button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} placeholder="Title" />
                          <Input value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} placeholder="Description" />
                        </div>
                        <DialogFooter><Button onClick={handleCreateProject} className="w-full bg-black">Create</Button></DialogFooter>
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
                      currentView === project.id ? 'bg-black text-white shadow-md' : 'text-[#495057] hover:bg-[#F1F3F5]'
                    )}
                  >
                    <FolderDot className={cn('w-5 h-5 shrink-0', currentView === project.id ? 'text-white' : 'text-[#ADB5BD]')} />
                    {isSidebarOpen && <span className="truncate flex-1 text-left">{project.title}</span>}
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-1">
            {isSidebarOpen ? (
              <div className="relative w-full h-10 rounded-full bg-indigo-600 p-1 flex">
                <button
                  type="button"
                  onClick={() => setZenMode(false)}
                  className="relative flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-full"
                >
                  {!zenMode && (
                    <motion.div
                      layoutId="zen-toggle-pill"
                      className="absolute inset-0 bg-white rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className={cn("relative z-10 flex items-center gap-1.5", !zenMode ? "text-indigo-600" : "text-white/90")}>
                    <Moon className="w-3.5 h-3.5" /> Off
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setZenMode(true)}
                  className="relative flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-full"
                >
                  {zenMode && (
                    <motion.div
                      layoutId="zen-toggle-pill"
                      className="absolute inset-0 bg-white rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className={cn("relative z-10 flex items-center gap-1.5", zenMode ? "text-indigo-600" : "text-white/90")}>
                    <Sun className="w-3.5 h-3.5" /> On
                  </span>
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setZenMode((z) => !z)}
                className={cn("w-full justify-center transition-all", zenMode ? "text-indigo-600" : "text-gray-500 hover:text-gray-800")}
              >
                {zenMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => supabase.auth.signOut()}
              className={cn("w-full text-gray-500 hover:text-red-500 transition-all", isSidebarOpen ? "justify-start" : "justify-center")}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="ml-2">Sign Out</span>}
            </Button>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50/50 h-full">
          <header className="h-16 shrink-0 border-b border-[#E9ECEF] bg-white/80 backdrop-blur-md flex items-center px-8 justify-between z-10">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#495057]">
                <Menu className="w-5 h-5" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2 text-sm font-medium text-[#495057]">
                <Layers className="w-4 h-4 text-[#ADB5BD]" />
                {['dashboard', 'daily', 'calendar', 'settings'].includes(currentView) ? (
                  <span className="font-bold text-black capitalize">{currentView.replace('-', ' ')}</span>
                ) : (
                  <>
                    <span className="cursor-pointer hover:text-black" onClick={() => setCurrentView('dashboard')}>Projects</span>
                    <ChevronRight className="w-4 h-4 text-[#ADB5BD]" />
                    <span className="font-bold text-black">{activeProject?.title || 'Unknown Project'}</span>
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
                    return <div className="p-20 text-center text-gray-400">Page not found</div>;
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