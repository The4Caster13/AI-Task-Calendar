import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useDraggable, useDroppable, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { 
  Plus, CheckCircle2, Circle, Trash2, Target, ArrowRight, ChevronRight, 
  Settings2, LayoutDashboard, Calendar, Layers, Star, Flame, Zap, 
  Menu, AlertCircle, Clock, FolderDot, BarChart3, KanbanSquare, LogOut, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Goal as Project, Task, AppState } from './types';
import { cn } from '@/lib/utils';

// --- Drag and Drop Helper Components ---
interface DroppableColumnProps {
  id: string;
  key?: React.Key;
  className?: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, className, children }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-black/10 shadow-inner scale-[1.01] transition-all")}
    >
      {children}
    </div>
  );
};

interface DraggableTaskProps {
  id: string;
  key?: React.Key;
  children: React.ReactNode;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none transition-opacity duration-200", 
        isDragging ? "opacity-30" : "opacity-100"
      )}
    >
      {children}
    </div>
  );
};

// --- Custom Flow Chart Component ---
const FlowChart = ({ projects, displayTasks }: { projects: Project[], displayTasks: any[] }) => {
  const colors = ['#5b4be0', '#7b6ef0', '#568cf5', '#4bc0e8', '#8be8e5']; 
  const activeProjects = projects.filter(p => displayTasks.some(t => t.projectId === p.id));
  const projectColors = Object.fromEntries(activeProjects.map((p, i) => [p.id, p.color || colors[i % colors.length]]));

  const columns = [
    { id: 'todo', label: 'To-Do', tasks: displayTasks.filter(t => !t.completed && !t.isPriority) },
    { id: 'doing', label: 'Doing', tasks: displayTasks.filter(t => !t.completed && t.isPriority) },
    { id: 'done', label: 'Done', tasks: displayTasks.filter(t => t.completed) }
  ];

  const columnData = columns.map(col => {
    let totalWeight = 0;
    const projectWeights = activeProjects.map(p => {
      const weight = col.tasks.filter(t => t.projectId === p.id).reduce((sum, t) => sum + (t.weight || 5), 0);
      totalWeight += weight;
      return { id: p.id, name: p.title, weight, color: projectColors[p.id] };
    });
    return { ...col, totalWeight, projectWeights };
  });

  const maxWeight = Math.max(...columnData.map(c => c.totalWeight), 1);
  const svgHeight = 280;
  const scale = svgHeight / maxWeight;
  const colWidth = 120;
  const gap = 6; 
  const positions = [50, 340, 630];

  const chartNodes: any = { todo: {}, doing: {}, done: {} };
  
  columnData.forEach((col) => {
    let currentY = svgHeight;
    col.projectWeights.forEach(pw => {
      const h = pw.weight * scale;
      if (h > 0) {
        chartNodes[col.id][pw.id] = { yTop: currentY - h, yBot: currentY, height: h, color: pw.color };
        currentY -= (h + gap);
      } else {
        chartNodes[col.id][pw.id] = { yTop: currentY, yBot: currentY, height: 0, color: pw.color };
      }
    });
  });

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <svg viewBox="0 0 800 350" className="w-full h-auto drop-shadow-sm overflow-visible">
        {activeProjects.map(p => {
          const t = chartNodes.todo[p.id];
          const d = chartNodes.doing[p.id];
          const dn = chartNodes.done[p.id];
          return (
            <g key={`ribbon-${p.id}`}>
              {(t.height > 0 || d.height > 0) && (
                <polygon points={`${positions[0]+colWidth},${t.yTop} ${positions[1]},${d.yTop} ${positions[1]},${d.yBot} ${positions[0]+colWidth},${t.yBot}`} fill={projectColors[p.id]} opacity="0.15" className="transition-all duration-500" />
              )}
              {(d.height > 0 || dn.height > 0) && (
                <polygon points={`${positions[1]+colWidth},${d.yTop} ${positions[2]},${dn.yTop} ${positions[2]},${dn.yBot} ${positions[1]+colWidth},${d.yBot}`} fill={projectColors[p.id]} opacity="0.15" className="transition-all duration-500" />
              )}
            </g>
          );
        })}
        {columnData.map((col, colIdx) => (
          <g key={`col-${col.id}`} transform={`translate(${positions[colIdx]}, 0)`}>
            <text x={colWidth/2} y={svgHeight + 30} textAnchor="middle" fill="#6B7280" className="text-sm font-semibold tracking-wide">{col.label}</text>
            <text x={colWidth/2} y={-15} textAnchor="middle" fill="#111827" className="text-xl font-bold">{col.totalWeight > 0 ? col.totalWeight + ' pts' : ''}</text>
            {col.projectWeights.map(pw => {
              const node = chartNodes[col.id][pw.id];
              if (node.height === 0) return null;
              return <rect key={`bar-${pw.id}`} x="0" y={node.yTop} width={colWidth} height={node.height} fill={node.color} rx="8" className="transition-all duration-500 hover:opacity-80 cursor-pointer"><title>{pw.name}: {pw.weight} pts</title></rect>;
            })}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
        {activeProjects.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: projectColors[p.id] }} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{p.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const uuid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const INITIAL_STATE: AppState = {
  goals: [
    {
      id: 'proj-1', title: '3D Architectural Portfolio', description: 'Build an explorable building structure using Three.js', color: '#5b4be0',
      tasks: [
        { id: uuid(), title: 'Setup base Three.js scene and camera', weight: 3, completed: true, isPriority: false, completedAt: Date.now() - 86400000 },
        { id: uuid(), title: 'Model dark matte architectural panels', weight: 5, completed: false, isPriority: true },
        { id: uuid(), title: 'Bind window modules to portfolioData', weight: 8, completed: false, isPriority: false }
      ],
      createdAt: Date.now(), updatedAt: Date.now(), status: 'active', deadline: Date.now() + (1000 * 60 * 60 * 24 * 14) 
    },
    {
      id: 'proj-2', title: 'IB Exams Prep', description: 'Review materials for upcoming HL History and SL English Lit', color: '#7b6ef0',
      tasks: [
        { id: uuid(), title: 'Compare Gatsby and Death of a Salesman themes', weight: 5, completed: true, isPriority: false, completedAt: Date.now() },
        { id: uuid(), title: 'Review Authoritarian States (Mao & Stalin)', weight: 7, completed: false, isPriority: true },
        { id: uuid(), title: 'Practice Paper 2 past paper', weight: 10, completed: false, isPriority: false }
      ],
      createdAt: Date.now(), updatedAt: Date.now(), status: 'active', deadline: Date.now() + (1000 * 60 * 60 * 24 * 30) 
    }
  ],
  activeGoalId: null, streak: 2, lastActiveDate: new Date().toDateString(),
};

export default function App() {
  // Supabase Auth & DB State
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App State
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'chart'>('kanban');
  
  const [currentView, setCurrentView] = useState<'dashboard' | string>('dashboard');
  const [activeId, setActiveId] = useState<string | null>(null);

  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setIsLoaded(false); 
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const loadData = async () => {
      const { data, error } = await supabase
        .from('user_data')
        .select('state')
        .eq('id', session.user.id)
        .single();

      if (data?.state) {
        setState(data.state as AppState);
      } else if (error && error.code === 'PGRST116') {
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
      await supabase
        .from('user_data')
        .update({ state: state, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }, 1000); 

    return () => clearTimeout(saveTimeout);
  }, [state, isLoaded, session]);

  const isGlobalView = currentView === 'dashboard';
  const activeProject = isGlobalView ? null : state.goals.find(g => g.id === currentView) || null;

  const displayTasks = useMemo(() => {
    if (isGlobalView) return state.goals.flatMap(project => project.tasks.map(task => ({ ...task, projectId: project.id, projectName: project.title })));
    return activeProject ? activeProject.tasks.map(t => ({ ...t, projectId: activeProject.id, projectName: activeProject.title })) : [];
  }, [isGlobalView, activeProject, state.goals]);

  const todoTasks = displayTasks.filter(t => !t.completed && !t.isPriority);
  const doingTasks = displayTasks.filter(t => !t.completed && t.isPriority);
  const doneTasks = displayTasks.filter(t => t.completed);

  const stats = { total: displayTasks.length, completed: doneTasks.length, remaining: todoTasks.length + doingTasks.length };
  const completedTodayCount = state.goals.reduce((acc, p) => acc + p.tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length, 0);

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    const brandColors = ['#5b4be0', '#7b6ef0', '#568cf5', '#4bc0e8', '#8be8e5'];
    const randomColor = brandColors[Math.floor(Math.random() * brandColors.length)];

    const newProject: Project = { id: uuid(), title: newProjectTitle, description: newProjectDesc, color: randomColor, tasks: [], createdAt: Date.now(), updatedAt: Date.now(), status: 'active' };
    setState(prev => ({ ...prev, goals: [...prev.goals, newProject] }));
    setCurrentView(newProject.id); setIsCreateModalOpen(false); setNewProjectTitle(''); setNewProjectDesc('');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const projectId = isGlobalView ? (newTaskProjectId || state.goals[0]?.id) : currentView;
    if (!projectId) return;

    // Map the dropdown selection to your app's core mechanics
    const priorityWeights: Record<string, number> = { Low: 2, Medium: 5, High: 8, Urgent: 10 };
    const isPriorityTask = newTaskPriority === 'High' || newTaskPriority === 'Urgent';

    const newTask: Task = { 
      id: uuid(), 
      title: newTaskTitle, 
      weight: priorityWeights[newTaskPriority] || 5, 
      completed: false, 
      isPriority: isPriorityTask 
    };
    
    setState(prev => ({ ...prev, goals: prev.goals.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, newTask], updatedAt: Date.now() } : p) }));
    setNewTaskTitle('');
    setNewTaskPriority('Medium'); 
  };

  const toggleTask = (taskId: string, projectId: string) => {
    const now = Date.now();
    setState(prev => ({ ...prev, goals: prev.goals.map(p => p.id === projectId ? { ...p, updatedAt: now, tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } : t) } : p) }));
  };

  const togglePriority = (taskId: string, projectId: string) => {
    setState(prev => ({ ...prev, goals: prev.goals.map(p => p.id === projectId ? { ...p, updatedAt: Date.now(), tasks: p.tasks.map(t => t.id === taskId ? { ...t, isPriority: !t.isPriority } : t) } : p) }));
  };

  const deleteTask = (taskId: string, projectId: string) => {
    setState(prev => ({ ...prev, goals: prev.goals.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId), updatedAt: Date.now() } : p) }));
  };

  const handleDragStart = (e: any) => setActiveId(e.active.id);
  const handleDragCancel = () => setActiveId(null);
  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id;
    const targetColumnId = over.id;
    const task = displayTasks.find(t => t.id === taskId);
    if (!task) return;

    setState(prev => ({
      ...prev, goals: prev.goals.map(project => {
        if (project.id !== task.projectId) return project;
        return {
          ...project, updatedAt: Date.now(), tasks: project.tasks.map(t => {
            if (t.id !== taskId) return t;
            if (targetColumnId === 'todo') return { ...t, completed: false, isPriority: false };
            if (targetColumnId === 'doing') return { ...t, completed: false, isPriority: true };
            if (targetColumnId === 'done') return { ...t, completed: true, completedAt: t.completed ? t.completedAt : Date.now() };
            return t;
          })
        };
      })
    }));
  };

  const renderTaskCard = (task: any, isOverlay = false) => {
    const isTodo = !task.completed && !task.isPriority;
    const isDoing = !task.completed && task.isPriority;
    const isDone = task.completed;

    return (
      <div className={cn(
        "p-4 rounded-xl shadow-sm flex flex-col group transition-all",
        isTodo && "bg-white border border-gray-100 gap-3",
        isDoing && "bg-white border-l-4 border-l-orange-400 border-t border-r border-b border-gray-100 gap-3",
        isDone && "bg-white/60 border border-emerald-100 gap-2",
        isOverlay && "scale-105 shadow-2xl ring-2 ring-black/5 rotate-2 cursor-grabbing opacity-100"
      )}>
        <p className={cn("text-sm font-semibold leading-tight", isDone ? "text-gray-500 line-through" : (isDoing ? "text-gray-800" : "text-gray-700"))}>{task.title}</p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            {isDoing && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded flex items-center gap-1"><Flame size={10} /> Active</span>}
            {isGlobalView && !isDone && <span className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[80px]">{task.projectName}</span>}
          </div>
          {isDone && <span className="text-[9px] font-bold text-emerald-500 uppercase">{new Date(task.completedAt!).toLocaleDateString()}</span>}
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" onPointerDown={(e) => e.stopPropagation()}>
            {!isDone && (
              <Tooltip><TooltipTrigger asChild>
                <button onClick={() => togglePriority(task.id, task.projectId)} className={cn("p-1.5 rounded-md transition-colors", isDoing ? "text-orange-400 hover:text-gray-500 hover:bg-gray-100" : "text-gray-400 hover:text-orange-500 hover:bg-orange-50")}>
                  <Star size={14} className={cn(isDoing && "fill-orange-400")} />
                </button>
              </TooltipTrigger><TooltipContent>{isDoing ? 'Remove from Doing' : 'Move to Doing'}</TooltipContent></Tooltip>
            )}
            <Tooltip><TooltipTrigger asChild>
              <button onClick={() => toggleTask(task.id, task.projectId)} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors">
                {isDone ? <Circle size={14} /> : <CheckCircle2 size={14} />}
              </button>
            </TooltipTrigger><TooltipContent>{isDone ? 'Mark Undone' : 'Mark Done'}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <button onClick={() => deleteTask(task.id, task.projectId)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-md transition-colors">
                <Trash2 size={14} />
              </button>
            </TooltipTrigger><TooltipContent>Delete Task</TooltipContent></Tooltip>
          </div>
        </div>
      </div>
    );
  };

  const activeDragTask = activeId ? displayTasks.find(t => t.id === activeId) : null;

  if (!session) {
    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error && error.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) alert(signUpError.message);
      } else if (error) {
        alert(error.message);
      }
    };

    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F9FA] font-sans">
        <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center space-y-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-md"><Target className="w-6 h-6 text-white" /></div>
            <h1 className="font-black text-2xl tracking-tight text-gray-900">TrueProgress</h1>
            <p className="text-sm text-gray-500 font-medium">Log in to sync your workspaces.</p>
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-3">
              <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-gray-50 border-gray-200" required />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-gray-50 border-gray-200" required minLength={6} />
            </div>
            <Button type="submit" className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all">Continue with Email</Button>
          </form>
          <p className="text-xs text-gray-400 mt-4">If you don't have an account, one will be created automatically.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) return null;

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans overflow-hidden">
        
        {/* Sidebar */}
        <motion.aside initial={false} animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }} className="bg-white border-r border-[#E9ECEF] flex flex-col relative z-20 shrink-0 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight whitespace-nowrap">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center"><Target className="w-5 h-5 text-white" /></div>
              TrueProgress
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-8 py-4 pb-20">
              <div className="space-y-1">
                <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">Overview</div>
                <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className={cn("w-full justify-start gap-3 rounded-xl font-semibold transition-all", currentView === 'dashboard' ? "bg-black text-white shadow-md shadow-black/10" : "text-[#495057] hover:bg-[#F1F3F5]")}>
                  <LayoutDashboard className="w-4 h-4" /> Global Dashboard
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-[#495057] hover:bg-[#F8F9FA]"><Calendar className="w-4 h-4" /> Schedule</Button>
              </div>

              <div className="space-y-1">
                <div className="px-2 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ADB5BD]">Projects</span>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild><button className="p-1 hover:bg-[#F1F3F5] rounded-md transition-colors"><Plus className="w-3.5 h-3.5 text-[#495057]" /></button></DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                      <DialogHeader><DialogTitle>New Project</DialogTitle><DialogDescription>Create a new workspace for your tasks.</DialogDescription></DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Project Title</Label><Input value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} placeholder="e.g., Launch Beta Version" /></div>
                        <div className="grid gap-2"><Label>Description</Label><Input value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Brief summary" /></div>
                      </div>
                      <DialogFooter><Button onClick={handleCreateProject} className="w-full bg-black">Create Project</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {state.goals.map(project => (
                  <button key={project.id} onClick={() => setCurrentView(project.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group", currentView === project.id ? "bg-black text-white shadow-md shadow-black/10" : "text-[#495057] hover:bg-[#F1F3F5]")}>
                    <FolderDot className={cn("w-4 h-4", currentView === project.id ? "text-white" : "text-[#ADB5BD]")} />
                    <span className="truncate flex-1 text-left">{project.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-[#E9ECEF]">
            <div className="bg-[#F8F9FA] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#495057]">Daily Streak</span>
                <div className="flex items-center gap-1 text-orange-500 font-bold text-sm"><Flame className="w-4 h-4 fill-orange-500" /> {state.streak}</div>
              </div>
              <div className="h-1.5 w-full bg-[#E9ECEF] rounded-full overflow-hidden"><div className="h-full bg-orange-500 w-2/3 rounded-full" /></div>
              <p className="text-[10px] text-[#ADB5BD] font-medium">Complete 1 more task today</p>
            </div>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()} className="w-full mt-2 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 justify-start px-4 transition-colors">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50/50 h-full">
          <header className="h-16 shrink-0 border-b border-[#E9ECEF] bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#495057]"><Menu className="w-5 h-5" /></Button>
              <Separator orientation="vertical" className="h-6 bg-[#E9ECEF]" />
              <div className="flex items-center gap-2 text-sm font-medium text-[#495057]">
                <Layers className="w-4 h-4 text-[#ADB5BD]" />
                {isGlobalView ? <span className="text-black font-bold">Global Workspace</span> : <><span className="cursor-pointer hover:text-black" onClick={()=>setCurrentView('dashboard')}>Projects</span> <ChevronRight className="w-4 h-4 text-[#ADB5BD]" /> <span className="text-black font-bold">{activeProject?.title}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-[#495057] shadow-sm"><Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />{completedTodayCount} Done Today</div>
            </div>
          </header>

          <ScrollArea className="flex-1 flex flex-col h-full">
            <div className="max-w-6xl mx-auto p-8 w-full flex-1 flex flex-col min-h-max pb-32">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div><h3 className="text-gray-500 text-sm font-semibold mb-1">Status Overview</h3><p className="text-lg font-bold text-gray-800 truncate">{isGlobalView ? 'All Projects' : activeProject?.title}</p></div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-500" size={28} /><span className="text-3xl font-black text-gray-800">{stats.completed}</span></div>
                    <p className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium">/ {stats.total} Total Tasks</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-gray-500 text-sm font-semibold mb-4">Pipeline Breakdown</h3>
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center border border-gray-100"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">To-Do</p><p className="text-xl font-black text-gray-700">{todoTasks.length}</p></div>
                    <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center border border-orange-100"><p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider mb-1">Doing</p><p className="text-xl font-black text-orange-700">{doingTasks.length}</p></div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                  <h3 className="text-gray-500 text-sm font-semibold mb-2">Projects Active</h3>
                  <div className="flex items-end gap-2"><span className="text-4xl font-black text-gray-800">{state.goals.filter(g => g.status !== 'completed').length}</span><span className="text-gray-500 font-medium pb-1">Workspaces</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 h-[600px] lg:h-auto">
                
                {/* Progress Board */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Layers className="w-5 h-5 text-gray-400" /> Progress {viewMode === 'kanban' ? 'Board' : 'Flow'}</h3>
                    <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <button onClick={() => setViewMode('kanban')} className={cn("p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all", viewMode === 'kanban' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600")}><KanbanSquare size={14} /> Board</button>
                      <button onClick={() => setViewMode('chart')} className={cn("p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all", viewMode === 'chart' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600")}><BarChart3 size={14} /> Chart</button>
                    </div>
                  </div>
                  
                  {viewMode === 'kanban' ? (
                    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                      <div className="flex items-stretch justify-between gap-4 flex-1 h-[450px]">
                        
                        <DroppableColumn id="todo" className="flex-1 bg-gray-50/50 rounded-xl border border-gray-200 p-4 flex flex-col gap-3 overflow-hidden">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 shrink-0">To-Do ({todoTasks.length})</h4>
                          <ScrollArea className="flex-1 -mx-2 px-2 [mask-image:linear-gradient(to_bottom,white_85%,transparent_100%)]">
                            <div className="space-y-3 pb-16">{todoTasks.map(task => <DraggableTask key={task.id} id={task.id}>{renderTaskCard(task)}</DraggableTask>)}</div>
                          </ScrollArea>
                        </DroppableColumn>
                        
                        <div className="flex items-center justify-center shrink-0"><ArrowRight className="text-gray-300" size={20} /></div>
                        
                        <DroppableColumn id="doing" className="flex-1 bg-orange-50/30 rounded-xl border border-orange-100 p-4 flex flex-col gap-3 overflow-hidden">
                          <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 shrink-0">Doing ({doingTasks.length})</h4>
                          <ScrollArea className="flex-1 -mx-2 px-2 [mask-image:linear-gradient(to_bottom,white_85%,transparent_100%)]">
                            <div className="space-y-3 pb-16">{doingTasks.map(task => <DraggableTask key={task.id} id={task.id}>{renderTaskCard(task)}</DraggableTask>)}</div>
                          </ScrollArea>
                        </DroppableColumn>

                        <div className="flex items-center justify-center shrink-0"><ArrowRight className="text-gray-300" size={20} /></div>
                        
                        <DroppableColumn id="done" className="flex-1 bg-emerald-50/30 rounded-xl border border-emerald-100 p-4 flex flex-col gap-3 overflow-hidden">
                          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 shrink-0">Done ({doneTasks.length})</h4>
                          <ScrollArea className="flex-1 -mx-2 px-2 [mask-image:linear-gradient(to_bottom,white_85%,transparent_100%)]">
                            <div className="space-y-3 pb-16">{doneTasks.map(task => <DraggableTask key={task.id} id={task.id}>{renderTaskCard(task)}</DraggableTask>)}</div>
                          </ScrollArea>
                        </DroppableColumn>

                      </div>
                      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>{activeDragTask ? renderTaskCard(activeDragTask, true) : null}</DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="flex-1 h-[450px] flex items-center justify-center overflow-visible">
                      <FlowChart projects={state.goals} displayTasks={displayTasks} />
                    </div>
                  )}
                </div>

                {/* Priority List */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> Action List</h3>
                    <span className="bg-red-50 text-red-600 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Priority</span>
                  </div>
                  <ScrollArea className="flex-1 -mx-4 px-4 [mask-image:linear-gradient(to_bottom,white_85%,transparent_100%)] h-[350px]">
                    <div className="flex flex-col gap-3 pb-16">
                      {doingTasks.length === 0 ? <div className="text-center py-10 px-4"><Star className="w-8 h-8 text-gray-200 mx-auto mb-3" /><p className="text-sm font-medium text-gray-500">No active priorities.</p></div> : doingTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-transparent transition-colors group">
                          <button onClick={() => toggleTask(task.id, task.projectId)} className="text-gray-400 hover:text-emerald-500 mt-0.5"><Circle size={18} /></button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{task.title}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">{isGlobalView ? <><FolderDot size={10} /> {task.projectName}</> : <><Clock size={10} /> Active Now</>}</p>
                              <button onClick={() => deleteTask(task.id, task.projectId)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {/* Custom Form Block */}
                  <form onSubmit={handleAddTask} className="pt-4 mt-2 border-t border-gray-100 shrink-0 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* PROJECT SELECTOR */}
                      {isGlobalView && state.goals.length > 0 && (
                        <div className="space-y-1.5 px-0.5">
                          <Label htmlFor="projectSelect" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Project</Label>
                          <div className="relative">
                            <select
                              id="projectSelect"
                              value={newTaskProjectId || state.goals[0]?.id || ''}
                              onChange={(e) => setNewTaskProjectId(e.target.value)}
                              className="w-full h-9 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all text-xs shadow-sm px-3 appearance-none font-semibold text-gray-700 cursor-pointer outline-none"
                            >
                              {state.goals.map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.title}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PRIORITY SELECTOR */}
                      <div className={cn("space-y-1.5 px-0.5", !isGlobalView && "col-span-2")}>
                        <Label htmlFor="prioritySelect" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Priority Level</Label>
                        <div className="relative">
                          <select
                            id="prioritySelect"
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                            className="w-full h-9 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all text-xs shadow-sm px-3 appearance-none font-semibold text-gray-700 cursor-pointer outline-none"
                          >
                            <option value="Low">🟢 Low</option>
                            <option value="Medium">🟡 Medium</option>
                            <option value="High">🟠 High</option>
                            <option value="Urgent">🔴 Urgent</option>
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TASK INPUT */}
                    <div className="relative mt-1">
                      <Input 
                        value={newTaskTitle} 
                        onChange={(e) => setNewTaskTitle(e.target.value)} 
                        placeholder="What needs to be done?" 
                        className="pr-10 bg-gray-50 border-gray-200 focus-visible:ring-black rounded-xl h-10 text-sm" 
                      />
                      <Button 
                        type="submit" 
                        disabled={!newTaskTitle.trim() || state.goals.length === 0} 
                        size="icon" 
                        className="absolute right-1 top-1 h-8 w-8 bg-black hover:bg-gray-800 rounded-lg disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            {/* Page Footer */}
            <footer className="w-full shrink-0 border-t border-[#E9ECEF] py-4 px-8 flex items-center justify-between text-xs text-gray-400 mt-auto">
              <div className="flex gap-4">
                <a href="#" className="hover:text-gray-800">Help Center</a>
                <a href="#" className="hover:text-gray-800">Terms of Service</a>
                <a href="#" className="hover:text-gray-800">Privacy Policy</a>
              </div>
              <div className="flex items-center gap-4">
                <span>© 2026 TrueProgress, Inc. All rights reserved.</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> All Systems Operational</span>
              </div>
            </footer>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}