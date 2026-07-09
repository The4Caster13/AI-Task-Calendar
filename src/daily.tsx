import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Trash2, TrendingUp, Clock, 
  ListTodo, Flame, Star, CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatDueDate } from '@/lib/utils';

const DUE_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-red-50 text-red-600",
  today: "bg-amber-50 text-amber-600",
  upcoming: "bg-slate-100 text-slate-500",
};

const PRIORITY_MAP = {
  high: { tailwind: "bg-red-500", text: "text-red-600", bg: "bg-red-50", hex: "#ef4444", label: "High" },
  medium: { tailwind: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", hex: "#f59e0b", label: "Medium" },
  low: { tailwind: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", hex: "#10b981", label: "Low" },
};

export default function DailyTasks({ state, setState }: { state: any, setState: any }) {
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const allTasks = useMemo(() => {
    return state.goals.flatMap((g: any) => 
      g.tasks.map((t: any) => ({ 
        ...t, 
        projectId: g.id, 
        projectName: g.title,
        normPriority: (t.priority || (t.isPriority ? 'high' : 'medium')).toLowerCase()
      }))
    );
  }, [state.goals]);

  // --- UPDATED: TWO-PASS TODAY'S FOCUS LOGIC ---
  const focusTasks = useMemo(() => {
    const pinned = allTasks.filter(t => state.focusTaskIds?.includes(t.id));
    if (pinned.length >= 3) return pinned.slice(0, 3);

    let autoPicks: any[] = [...pinned];
    const projectIdsInFocus = new Set(pinned.map(t => t.projectId));

    const candidates = allTasks
      .filter(t => !t.completed && !state.focusTaskIds?.includes(t.id))
      .sort((a, b) => {
        const scores: any = { high: 3, medium: 2, low: 1 };
        return scores[b.normPriority] - scores[a.normPriority];
      });

    // PASS 1: One per project
    for (const task of candidates) {
      if (!projectIdsInFocus.has(task.projectId)) {
        autoPicks.push(task);
        projectIdsInFocus.add(task.projectId);
        if (autoPicks.length === 3) break;
      }
    }

    // PASS 2: Fill remaining slots by urgency regardless of project
    if (autoPicks.length < 3) {
      for (const task of candidates) {
        if (!autoPicks.find(p => p.id === task.id)) {
          autoPicks.push(task);
        }
        if (autoPicks.length === 3) break;
      }
    }

    return autoPicks;
  }, [allTasks, state.focusTaskIds]);

  const togglePin = (taskId: string) => {
    setState((prev: any) => {
      const currentPins = prev.focusTaskIds || [];
      const isPinned = currentPins.includes(taskId);
      return {
        ...prev,
        focusTaskIds: isPinned 
          ? currentPins.filter((id: string) => id !== taskId) 
          : [...currentPins, taskId].slice(-3) 
      };
    });
  };

  const currentUrgency = useMemo(() => {
    const incomplete = allTasks.filter((t: any) => !t.completed);
    if (incomplete.length === 0) return PRIORITY_MAP.low;
    if (incomplete.some(t => t.normPriority === 'high')) return PRIORITY_MAP.high;
    if (incomplete.some(t => t.normPriority === 'medium')) return PRIORITY_MAP.medium;
    return PRIORITY_MAP.low;
  }, [allTasks]);

  const settings = state.settings || { dayStart: 9, dayEnd: 18 };

  const getTimeProgress = () => {
    const h = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (h < settings.dayStart) return 0;
    if (h > settings.dayEnd) return 100;
    return ((h - settings.dayStart) / (settings.dayEnd - settings.dayStart)) * 100;
  };

  const getTaskProgress = () => {
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter((t: any) => t.completed).length;
    return (completed / allTasks.length) * 100;
  };

  const addTask = () => {
    if (!newTask.trim() || state.goals.length === 0) return;
    const projectId = state.goals[0].id;
    const newTaskObj = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTask,
      completed: false,
      priority: newPriority,
      isPriority: newPriority === "high",
      ...(newDueDate ? { dueDate: new Date(newDueDate).getTime() } : {}),
    };
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) =>
        g.id === projectId ? { ...g, tasks: [...g.tasks, newTaskObj], updatedAt: Date.now() } : g
      )
    }));
    setNewTask("");
    setNewDueDate("");
  };

  const toggleTask = (taskId: string, projectId: string) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((p: any) => 
        p.id === projectId ? { 
          ...p, 
          tasks: p.tasks.map((t: any) => t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t) 
        } : p
      )
    }));
  };

  const deleteTask = (taskId: string, projectId: string) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((p: any) => 
        p.id === projectId ? { ...p, tasks: p.tasks.filter((t: any) => t.id !== taskId) } : p
      )
    }));
  };

  const timeProgress = getTimeProgress();
  const taskProgress = getTaskProgress();
  const isAhead = taskProgress >= timeProgress;

  const sortedTasks = [...allTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity);
  });

  return (
    <div className="w-full space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={allTasks.length} sub="tracked today" dotColor="bg-slate-200" />
        <StatCard label="Completed" value={allTasks.filter((t:any)=>t.completed).length} sub={`+${allTasks.filter((t:any)=>t.completed).length} done`} dotColor="bg-indigo-500" accent="text-indigo-600" />
        <StatCard label="Remaining" value={allTasks.length - allTasks.filter((t:any)=>t.completed).length} sub={`${currentUrgency.label} focus`} dotColor={currentUrgency.tailwind} accent={currentUrgency.text} />
        <StatCard label="Day Elapsed" value={`${timeProgress.toFixed(1)}%`} sub="of today" dotColor="bg-slate-800" accent="text-slate-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* UPDATED: UNIFIED PACING BAR */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-slate-800">Progress Overview</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full opacity-30", currentUrgency.tailwind)} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Time: {timeProgress.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", currentUrgency.tailwind)} />
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Tasks: {taskProgress.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="relative h-6 w-full bg-slate-50 rounded-xl border border-slate-100 overflow-hidden shadow-inner">
              {/* Day Progress (Ghost Layer - 30% Translucent) */}
              <div 
                className={cn("absolute top-0 left-0 h-full transition-all duration-1000 opacity-30", currentUrgency.tailwind)} 
                style={{ width: `${timeProgress}%` }}
              />
              
              {/* Task Completion (Solid Layer) */}
              <div 
                className={cn("absolute top-0 left-0 h-full transition-all duration-700 shadow-[2px_0_10px_rgba(0,0,0,0.1)]", currentUrgency.tailwind)} 
                style={{ width: `${taskProgress}%` }}
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em]">
                  {isAhead ? "Pacing Ahead" : "Catching Up"}
                </span>
              </div>
            </div>
            
            <p className="mt-4 text-[10px] text-slate-400 text-center font-medium italic">
              {isAhead 
                ? "You're outperforming the clock. Keep the momentum!" 
                : "The clock is catching up. Focus on high priority items."}
            </p>
          </div>

          {/* Today's Tasks */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold">Today's Tasks</h3>
              <span className="bg-slate-100 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{allTasks.length} TOTAL</span>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a new task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  className="flex-1 rounded-lg h-10 border-slate-200"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none"
                />
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <Button onClick={addTask} className="h-10 bg-indigo-600 hover:bg-indigo-700 px-6">Add</Button>
              </div>

              <div className="space-y-1">
                {sortedTasks.map((task: any) => {
                  const cfg = PRIORITY_MAP[task.normPriority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.medium;
                  const isPinned = state.focusTaskIds?.includes(task.id);
                  const due = formatDueDate(task.dueDate);
                  return (
                    <div key={task.id} className={cn(
                      "group flex items-center gap-4 py-3 px-2 rounded-xl transition-all",
                      task.completed ? "opacity-40" : "hover:bg-slate-50"
                    )}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id, task.projectId)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold truncate", task.completed && "line-through text-slate-400")}>
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {due && (
                          <span className={cn("text-[9px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap", DUE_TONE_CLASSES[due.tone])}>
                            {due.label}
                          </span>
                        )}
                        <button
                          onClick={() => togglePin(task.id)}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            isPinned ? "text-amber-500 bg-amber-50" : "text-slate-200 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Star size={14} fill={isPinned ? "currentColor" : "none"} />
                        </button>
                        <span className={cn("text-[9px] font-black px-2 py-1 rounded-md uppercase", cfg.bg, cfg.text)}>
                          {cfg.label}
                        </span>
                        <button onClick={() => deleteTask(task.id, task.projectId)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* TODAY'S FOCUS CARD */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Today's Focus</h4>
                <p className="text-[11px] text-slate-400">Top priorities across projects</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {focusTasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No focus tasks identified.</p>
              ) : (
                focusTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                    <div className={`w-1 h-6 rounded-full ${PRIORITY_MAP[task.normPriority as keyof typeof PRIORITY_MAP]?.tailwind}`} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-bold truncate", task.completed && "line-through text-slate-400")}>{task.title}</p>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">{task.projectName}</p>
                    </div>
                    <button onClick={() => toggleTask(task.id, task.projectId)}>
                      <CheckCircle2 size={18} className={task.completed ? "text-emerald-500" : "text-slate-200 hover:text-slate-400"} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {state.focusTaskIds?.length > 0 && (
              <button 
                onClick={() => setState((p:any) => ({...p, focusTaskIds: []}))}
                className="text-[9px] font-black text-indigo-500 uppercase tracking-widest w-full pt-2 hover:underline"
              >
                Reset to Auto-Selection
              </button>
            )}
          </div>

          <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
            <h3 className="text-sm font-semibold self-start mb-6">Completion</h3>
            <RingChart value={taskProgress} color={currentUrgency.hex} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function StatCard({ label, value, sub, dotColor, accent }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
        <span className={cn("text-[10px] font-bold", accent)}>{sub}</span>
      </div>
    </div>
  );
}

function RingChart({ value, color }: { value: number, color: string }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dash = (value / 100) * circumference;
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-800">{value.toFixed(0)}%</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">done</span>
      </div>
    </div>
  );
}