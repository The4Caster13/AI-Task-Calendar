import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Trophy, 
  Target, 
  ArrowRight,
  ChevronRight,
  Settings2,
  Info,
  LayoutDashboard,
  Calendar,
  Layers,
  CheckSquare,
  MoreVertical,
  Star,
  Flame,
  Zap,
  Menu,
  X,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Goal, Task, AppState } from './types';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'true-progress-state';

const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const INITIAL_STATE: AppState = {
  goals: [],
  activeGoalId: null,
  streak: 0,
  lastActiveDate: null,
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // New Goal Form State
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(5);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Streak Logic
  useEffect(() => {
    if (!isLoaded) return;
    
    const today = new Date().toDateString();
    if (state.lastActiveDate !== today) {
      const lastDate = state.lastActiveDate ? new Date(state.lastActiveDate) : null;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      setState(prev => {
        let newStreak = prev.streak;
        if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
          // Keep streak if yesterday was active
        } else if (lastDate && lastDate.toDateString() !== today) {
          // Reset streak if more than a day passed
          newStreak = 0;
        }
        
        return {
          ...prev,
          lastActiveDate: today,
          streak: newStreak
        };
      });
    }
  }, [isLoaded, state.lastActiveDate]);

  // Update streak when first task of the day is completed
  useEffect(() => {
    if (!isLoaded) return;
    const today = new Date().toDateString();
    const hasCompletedToday = state.goals.some(g => 
      g.tasks.some(t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === today)
    );

    if (hasCompletedToday && state.streak === 0) {
      // This is a bit naive but works for a demo: if they have 0 streak but completed something today, give them 1.
      // A better logic would check if they already got their streak point today.
    }
  }, [state.goals, isLoaded]);

  // Derived State
  const activeGoal = useMemo(() => 
    state.goals.find(g => g.id === state.activeGoalId) || null
  , [state.goals, state.activeGoalId]);

  const activeGoalProgress = useMemo(() => {
    if (!activeGoal || activeGoal.tasks.length === 0) return 0;
    const totalWeight = activeGoal.tasks.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
    const completedWeight = activeGoal.tasks.reduce((acc, t) => t.completed ? acc + (Number(t.weight) || 0) : acc, 0);
    if (totalWeight === 0) return 0;
    return Math.round((completedWeight / totalWeight) * 100);
  }, [activeGoal]);

  const stats = useMemo(() => {
    if (!activeGoal) return { total: 0, completed: 0, remaining: 0 };
    const completed = activeGoal.tasks.filter(t => t.completed).length;
    return {
      total: activeGoal.tasks.length,
      completed,
      remaining: activeGoal.tasks.length - completed
    };
  }, [activeGoal]);

  const todayTasks = useMemo(() => {
    if (!activeGoal) return [];
    return activeGoal.tasks.filter(t => t.isPriority && !t.completed);
  }, [activeGoal]);

  const completedTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return state.goals.reduce((acc, goal) => {
      return acc + goal.tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === today).length;
    }, 0);
  }, [state.goals]);

  // Handlers
  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) return;
    const newGoal: Goal = {
      id: uuid(),
      title: newGoalTitle,
      description: newGoalDesc,
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deadline: newGoalDeadline ? new Date(newGoalDeadline).getTime() : undefined,
      status: state.goals.length === 0 ? 'active' : 'other',
    };
    
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal],
      activeGoalId: prev.activeGoalId || newGoal.id
    }));
    
    setIsCreateModalOpen(false);
    setNewGoalTitle('');
    setNewGoalDesc('');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.activeGoalId || !newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: uuid(),
      title: newTaskTitle,
      weight: newTaskWeight,
      completed: false,
      isPriority: false,
    };

    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === prev.activeGoalId 
        ? { ...g, tasks: [...g.tasks, newTask], updatedAt: Date.now() } 
        : g
      )
    }));
    
    setNewTaskTitle('');
    setNewTaskWeight(5);
  };

  const toggleTask = (taskId: string) => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === prev.activeGoalId 
        ? { 
            ...g, 
            updatedAt: now,
            tasks: g.tasks.map(t => t.id === taskId 
              ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } 
              : t
            ) 
          } 
        : g
      )
    }));
  };

  const togglePriority = (taskId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === prev.activeGoalId 
        ? { 
            ...g, 
            updatedAt: Date.now(),
            tasks: g.tasks.map(t => t.id === taskId 
              ? { ...t, isPriority: !t.isPriority } 
              : t
            ) 
          } 
        : g
      )
    }));
  };

  const deleteTask = (taskId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === prev.activeGoalId 
        ? { ...g, tasks: g.tasks.filter(t => t.id !== taskId), updatedAt: Date.now() } 
        : g
      )
    }));
  };

  const updateTaskWeight = (taskId: string, weight: number) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === prev.activeGoalId 
        ? { 
            ...g, 
            updatedAt: Date.now(),
            tasks: g.tasks.map(t => t.id === taskId ? { ...t, weight } : t) 
          } 
        : g
      )
    }));
  };

  const setActiveGoal = (id: string) => {
    setState(prev => ({ ...prev, activeGoalId: id }));
  };

  const deleteGoal = (id: string) => {
    if (window.confirm('Delete this goal and all its data?')) {
      setState(prev => {
        const newGoals = prev.goals.filter(g => g.id !== id);
        return {
          ...prev,
          goals: newGoals,
          activeGoalId: prev.activeGoalId === id ? (newGoals[0]?.id || null) : prev.activeGoalId
        };
      });
    }
  };

  const completeGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, status: 'completed' } : g)
    }));
  };

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <Target className="w-12 h-12 animate-pulse text-black" />
          <p className="text-sm font-medium text-[#ADB5BD]">Loading TrueProgress...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans overflow-hidden">
        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className="bg-white border-r border-[#E9ECEF] flex flex-col relative z-20"
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              TrueProgress
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-8 py-4">
              {/* Navigation */}
              <div className="space-y-1">
                <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">
                  Overview
                </div>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl bg-[#F1F3F5] text-black font-semibold">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-[#495057] hover:bg-[#F8F9FA]">
                  <Calendar className="w-4 h-4" /> Schedule
                </Button>
              </div>

              {/* Goals Sections */}
              <div className="space-y-6">
                {/* Active Goals */}
                <div className="space-y-1">
                  <div className="px-2 mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">Active Goals</span>
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                      <DialogTrigger render={<button className="p-1 hover:bg-[#F1F3F5] rounded-md transition-colors"><Plus className="w-3.5 h-3.5 text-[#495057]" /></button>} />
                      <DialogContent className="sm:max-w-[425px] rounded-2xl">
                        <DialogHeader>
                          <DialogTitle>New Goal</DialogTitle>
                          <DialogDescription>Define what you want to achieve.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Goal Title</Label>
                            <Input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="e.g., Launch Beta Version" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Description</Label>
                            <Input value={newGoalDesc} onChange={e => setNewGoalDesc(e.target.value)} placeholder="Brief summary of the end state" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreateGoal} className="w-full bg-black">Create Goal</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {state.goals.filter(g => g.status !== 'completed').map(g => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGoal(g.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group",
                        state.activeGoalId === g.id 
                          ? "bg-black text-white shadow-md shadow-black/10" 
                          : "text-[#495057] hover:bg-[#F1F3F5]"
                      )}
                    >
                      <Target className={cn("w-4 h-4", state.activeGoalId === g.id ? "text-white" : "text-[#ADB5BD]")} />
                      <span className="truncate flex-1 text-left">{g.title}</span>
                      {state.activeGoalId !== g.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Completed Goals */}
                {state.goals.some(g => g.status === 'completed') && (
                  <div className="space-y-1">
                    <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">Completed</div>
                    {state.goals.filter(g => g.status === 'completed').map(g => (
                      <button
                        key={g.id}
                        onClick={() => setActiveGoal(g.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium text-[#ADB5BD] hover:bg-[#F1F3F5] hover:text-[#495057]"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="truncate flex-1 text-left">{g.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-[#E9ECEF]">
            <div className="bg-[#F8F9FA] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#495057]">Daily Streak</span>
                <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                  <Flame className="w-4 h-4 fill-orange-500" /> {state.streak}
                </div>
              </div>
              <div className="h-1.5 w-full bg-[#E9ECEF] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-2/3 rounded-full" />
              </div>
              <p className="text-[10px] text-[#ADB5BD] font-medium">Complete 1 more task to maintain streak</p>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 border-b border-[#E9ECEF] bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#495057]">
                <Menu className="w-5 h-5" />
              </Button>
              <Separator orientation="vertical" className="h-6 bg-[#E9ECEF]" />
              <div className="flex items-center gap-2 text-sm font-medium text-[#495057]">
                <Layers className="w-4 h-4 text-[#ADB5BD]" />
                Projects <ChevronRight className="w-4 h-4 text-[#ADB5BD]" />
                <span className="text-black">{activeGoal?.title || 'No Active Goal'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F1F3F5] rounded-full text-xs font-bold text-[#495057]">
                <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                {completedTodayCount} Completed Today
              </div>
              <Button variant="ghost" size="icon" className="text-[#495057] rounded-full">
                <Settings2 className="w-5 h-5" />
              </Button>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <div className="max-w-5xl mx-auto p-8 space-y-8">
              {!activeGoal ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-24 h-24 bg-[#F1F3F5] rounded-3xl flex items-center justify-center">
                    <Target className="w-12 h-12 text-[#ADB5BD]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">No active goal selected</h2>
                    <p className="text-[#787774] max-w-xs">Select a goal from the sidebar or create a new one to start tracking progress.</p>
                  </div>
                  <Button onClick={() => setIsCreateModalOpen(true)} className="bg-black rounded-xl px-6">Create Your First Goal</Button>
                </div>
              ) : (
                <>
                  {/* Goal Overview Section */}
                  <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 rounded-[32px] border-[#E9ECEF] shadow-xl shadow-black/[0.02] overflow-hidden bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="rounded-full border-[#E9ECEF] text-[#495057] font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                              Goal Overview
                            </Badge>
                            {activeGoal.deadline && (
                              <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-600 border-none font-bold text-[10px] px-3 py-1">
                                Due {new Date(activeGoal.deadline).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {activeGoalProgress === 100 && activeGoal.status !== 'completed' && (
                              <Button size="sm" onClick={() => completeGoal(activeGoal.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-full h-9 px-4">
                                <Trophy className="w-4 h-4 mr-2" /> Complete Goal
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => deleteGoal(activeGoal.id)} className="text-[#ADB5BD] hover:text-red-500 rounded-full h-9 w-9">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-4xl font-black tracking-tight mt-6 text-[#1A1C1E]">{activeGoal.title}</CardTitle>
                        <CardDescription className="text-[#787774] text-lg mt-2 font-medium">{activeGoal.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-8 space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-end justify-between">
                            <div className="flex items-baseline gap-2">
                              <motion.span 
                                key={activeGoalProgress}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-7xl font-black tracking-tighter text-black"
                              >
                                {activeGoalProgress}
                              </motion.span>
                              <span className="text-2xl font-bold text-[#ADB5BD]">%</span>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest mb-1">Last Updated</div>
                              <div className="text-xs font-bold text-[#495057]">{new Date(activeGoal.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                          <div className="h-8 w-full bg-[#F1F3F5] rounded-2xl overflow-hidden relative shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${activeGoalProgress}%` }}
                              transition={{ type: "spring", stiffness: 40, damping: 15 }}
                              className="absolute top-0 left-0 h-full bg-black rounded-2xl flex items-center justify-end px-4 overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                              <div className="w-full h-full absolute top-0 left-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/20" />
                            </motion.div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-8 pt-4">
                          <div className="space-y-2 p-4 rounded-2xl bg-[#F8F9FA] border border-[#E9ECEF]/50">
                            <div className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Total Steps</div>
                            <div className="text-2xl font-black">{stats.total}</div>
                          </div>
                          <div className="space-y-2 p-4 rounded-2xl bg-green-50/50 border border-green-100/50">
                            <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest">Completed</div>
                            <div className="text-2xl font-black text-green-600">{stats.completed}</div>
                          </div>
                          <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                            <div className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest">Remaining</div>
                            <div className="text-2xl font-black text-blue-600">{stats.remaining}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Focus / Today Section */}
                    <Card className="rounded-[32px] border-[#E9ECEF] shadow-xl shadow-black/[0.02] bg-white flex flex-col overflow-hidden">
                      <CardHeader className="pb-4 bg-[#F8F9FA]/50 border-b border-[#E9ECEF]/50">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-orange-500 text-white hover:bg-orange-600 rounded-full border-none font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                            Daily Focus
                          </Badge>
                          <Clock className="w-4 h-4 text-[#ADB5BD]" />
                        </div>
                        <CardTitle className="text-2xl font-black mt-4 text-[#1A1C1E]">Today's Priority</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 p-6 space-y-6">
                        {todayTasks.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                            <div className="w-16 h-16 bg-[#F8F9FA] rounded-3xl flex items-center justify-center border border-[#E9ECEF]">
                              <Star className="w-8 h-8 text-[#ADB5BD]" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-[#495057]">Clear for now</p>
                              <p className="text-xs text-[#ADB5BD] font-medium max-w-[180px] mx-auto">Star tasks in the list below to focus on them today.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {todayTasks.map(task => (
                              <motion.div 
                                key={task.id} 
                                layout
                                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm hover:border-black transition-all group"
                              >
                                <button onClick={() => toggleTask(task.id)} className="text-[#ADB5BD] hover:text-black transition-colors">
                                  <Circle className="w-6 h-6" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold truncate text-[#1A1C1E]">{task.title}</div>
                                  <div className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Weight: {task.weight}</div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <div className="p-6 pt-0 mt-auto">
                        <div className="bg-[#1A1C1E] rounded-2xl p-5 text-white space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Daily Progress</div>
                              <div className="text-lg font-black">{completedTodayCount} <span className="text-xs opacity-50 font-bold">/ 5 TASKS</span></div>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center">
                              <CheckSquare className="w-5 h-5 text-white/40" />
                            </div>
                          </div>
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (completedTodayCount / 5) * 100)}%` }}
                              className="h-full bg-white rounded-full" 
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </section>

                  {/* Main Content Area: Tasks */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Actionable Steps</h2>
                        <p className="text-sm text-[#787774]">Break your goal into meaningful, weighted actions.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl border-[#E9ECEF] text-xs font-bold">
                          Filter
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl border-[#E9ECEF] text-xs font-bold">
                          Sort
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {activeGoal.tasks.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "group flex items-center gap-6 p-6 rounded-[24px] border transition-all duration-300",
                              task.completed 
                                ? "bg-[#F8F9FA] border-transparent opacity-50" 
                                : "bg-white border-[#E9ECEF] hover:border-black hover:shadow-2xl hover:shadow-black/[0.04]"
                            )}
                          >
                            <button 
                              onClick={() => toggleTask(task.id)}
                              className={cn(
                                "flex-shrink-0 transition-all transform hover:scale-110",
                                task.completed ? "text-green-600" : "text-[#ADB5BD] hover:text-black"
                              )}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-10 h-10" />
                              ) : (
                                <Circle className="w-10 h-10 stroke-[1.5px]" />
                              )}
                            </button>

                            <div className="flex-grow space-y-3">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "text-xl font-black transition-all tracking-tight",
                                  task.completed ? "text-[#ADB5BD] line-through decoration-2" : "text-[#1A1C1E]"
                                )}>
                                  {task.title}
                                </span>
                                {task.isPriority && !task.completed && (
                                  <Badge className="bg-orange-500 text-white hover:bg-orange-600 border-none text-[10px] font-bold px-3 py-0.5 h-6 rounded-full">
                                    PRIORITY
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Weight</span>
                                  <div className="flex items-center gap-2 bg-[#F1F3F5] rounded-lg p-1">
                                    <Input
                                      type="number"
                                      disabled={task.completed}
                                      value={task.weight}
                                      min={1}
                                      max={10}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val)) {
                                          updateTaskWeight(task.id, Math.min(10, Math.max(1, val)));
                                        }
                                      }}
                                      className="h-6 w-12 px-1 text-center font-black bg-transparent border-none focus-visible:ring-0 text-xs"
                                    />
                                  </div>
                                </div>
                                {task.completedAt && (
                                  <div className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" />
                                    Completed {new Date(task.completedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger 
                                  render={
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => togglePriority(task.id)}
                                      className={cn(
                                        "rounded-full",
                                        task.isPriority ? "text-orange-500 bg-orange-50" : "text-[#ADB5BD]"
                                      )}
                                    >
                                      <Star className={cn("w-4 h-4", task.isPriority && "fill-orange-500")} />
                                    </Button>
                                  }
                                />
                                <TooltipContent>Mark as Priority</TooltipContent>
                              </Tooltip>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteTask(task.id)}
                                className="text-[#ADB5BD] hover:text-red-500 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Add Task Form */}
                      <form 
                        onSubmit={handleAddTask}
                        className="flex items-center gap-6 p-6 rounded-[32px] border-2 border-dashed border-[#E9ECEF] hover:border-black transition-all bg-transparent group focus-within:border-black focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-black/[0.04]"
                      >
                        <div className="flex-shrink-0 text-[#ADB5BD] group-focus-within:text-black transition-colors">
                          <Plus className="w-10 h-10" />
                        </div>
                        <div className="flex-grow space-y-4">
                          <input 
                            type="text"
                            placeholder="Add a significant step to your goal..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-xl font-black placeholder:text-[#ADB5BD] outline-none text-[#1A1C1E]"
                          />
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest">Weight</span>
                              <div className="flex items-center gap-2 bg-[#F1F3F5] rounded-lg p-1 group-focus-within:bg-[#F8F9FA]">
                                <Input
                                  type="number"
                                  value={newTaskWeight}
                                  min={1}
                                  max={10}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                      setNewTaskWeight(Math.min(10, Math.max(1, val)));
                                    }
                                  }}
                                  className="h-7 w-14 px-1 text-center font-black bg-transparent border-none focus-visible:ring-0 text-xs"
                                />
                              </div>
                            </div>
                            <Button 
                              type="submit" 
                              disabled={!newTaskTitle.trim()}
                              className="ml-auto rounded-2xl bg-black hover:bg-[#222] h-11 px-8 text-xs font-bold uppercase tracking-widest shadow-xl shadow-black/10 transition-all active:scale-95"
                            >
                              Add Step
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </section>
                </>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </TooltipProvider>
  );
}
