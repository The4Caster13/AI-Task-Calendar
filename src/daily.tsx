import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Trash2, Clock,
  ListTodo, Flame, Star, CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDueDate } from '@/lib/utils';
import { getHolidayForDate } from '@/lib/holidays';
import { getAllTasks, toggleTaskInState, deleteTaskFromState, addTaskToState } from '@/lib/tasks';

const DUE_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-clay/15 text-clay",
  upcoming: "bg-muted text-muted-foreground",
};

const PRIORITY_MAP = {
  high: { tailwind: "bg-espresso", text: "text-espresso", bg: "bg-espresso/10", hex: "#5A322A", label: "High" },
  medium: { tailwind: "bg-clay", text: "text-clay", bg: "bg-clay/10", hex: "#BC7B6F", label: "Medium" },
  low: { tailwind: "bg-slate-blue", text: "text-slate-blue", bg: "bg-slate-blue/10", hex: "#718A9E", label: "Low" },
};

export default function DailyTasks({ state, setState }: { state: any, setState: any }) {
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const allTasks = useMemo(() => (
    getAllTasks(state).map((t: any) => ({
      ...t,
      normPriority: (t.priority || (t.isPriority ? 'high' : 'medium')).toLowerCase(),
    }))
  ), [state.goals, state.tasks]);

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
    if (!newTask.trim()) return;
    const newTaskObj = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTask,
      completed: false,
      priority: newPriority,
      isPriority: newPriority === "high",
      ...(newDueDate ? { dueDate: new Date(newDueDate).getTime() } : {}),
    };
    setState((prev: any) => addTaskToState(prev, newProjectId || null, newTaskObj));
    setNewTask("");
    setNewDueDate("");
  };

  const toggleTask = (taskId: string, projectId: string | null) => {
    setState((prev: any) => toggleTaskInState(prev, taskId, projectId));
  };

  const deleteTask = (taskId: string, projectId: string | null) => {
    setState((prev: any) => deleteTaskFromState(prev, taskId, projectId));
  };

  const timeProgress = getTimeProgress();
  const taskProgress = getTaskProgress();
  const isAhead = taskProgress >= timeProgress;

  const sortedTasks = [...allTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity);
  });

  const dayLabel = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const weekdayLabel = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const monthShortLabel = currentTime.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dateOfMonth = currentTime.getDate();
  const holidayLabel = getHolidayForDate(currentTime);

  return (
    <div className="w-full p-8 pb-32 space-y-8">
      {/* Today's Pacing — the day's central metric. No card box: sits directly
          on the page as this view's spine, mirroring the Dashboard's
          Overall Completion bar instead of living in another widget box. */}
      <div className="space-y-5 pb-6 border-b border-border">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">{dayLabel}</h2>
            <p className="text-5xl font-black tracking-tighter text-foreground leading-none">
              {taskProgress.toFixed(0)}<span className="text-2xl text-muted-foreground">%</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full opacity-30", currentUrgency.tailwind)} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Time: {timeProgress.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", currentUrgency.tailwind)} />
              <span className="text-[10px] font-bold text-foreground uppercase">Tasks: {taskProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="relative h-5 w-full bg-muted rounded-full overflow-hidden">
          {/* Day Progress (Ghost Layer - 30% Translucent) */}
          <div
            className={cn("absolute top-0 left-0 h-full transition-all duration-1000 opacity-30", currentUrgency.tailwind)}
            style={{ width: `${timeProgress}%` }}
          />
          {/* Task Completion (Solid Layer) */}
          <div
            className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-700", currentUrgency.tailwind)}
            style={{ width: `${taskProgress}%` }}
          />
        </div>

        <p className="text-[10px] font-mono text-muted-foreground">
          {isAhead
            ? `Pacing ahead — you're outperforming the clock. ${allTasks.filter((t: any) => t.completed).length}/${allTasks.length} tasks done.`
            : `Catching up — the clock is ahead. Focus on high priority items. ${allTasks.filter((t: any) => t.completed).length}/${allTasks.length} tasks done.`}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={allTasks.length} sub="tracked today" dotColor="bg-muted-foreground/30" />
        <StatCard label="Completed" value={allTasks.filter((t:any)=>t.completed).length} sub={`+${allTasks.filter((t:any)=>t.completed).length} done`} dotColor="bg-primary" accent="text-primary" />
        <StatCard label="Remaining" value={allTasks.length - allTasks.filter((t:any)=>t.completed).length} sub={`${currentUrgency.label} focus`} dotColor={currentUrgency.tailwind} accent={currentUrgency.text} />
        <StatCard label="Day Elapsed" value={`${timeProgress.toFixed(1)}%`} sub="of today" dotColor="bg-foreground" accent="text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold">Today's Tasks</h3>
              <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">{allTasks.length} TOTAL</span>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Input
                  placeholder="Add a new task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  className="flex-1 min-w-[160px] rounded-lg h-10 border-border"
                />
                <Select value={newProjectId || "none"} onValueChange={(v) => setNewProjectId(v === "none" ? "" : (v as string))}>
                  <SelectTrigger className="h-10 bg-muted border-border rounded-lg text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {state.goals.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold outline-none"
                />
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                  <SelectTrigger className="h-10 bg-muted border-border rounded-lg text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addTask} className="h-10 bg-primary hover:bg-primary/90 px-6">Add</Button>
              </div>

              <div className="space-y-1">
                {sortedTasks.map((task: any) => {
                  const cfg = PRIORITY_MAP[task.normPriority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.medium;
                  const isPinned = state.focusTaskIds?.includes(task.id);
                  const due = formatDueDate(task.dueDate);
                  return (
                    <div key={task.id} className={cn(
                      "group flex items-center gap-4 py-3 px-2 rounded-xl transition-all",
                      task.completed ? "opacity-40" : "hover:bg-muted"
                    )}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id, task.projectId)}
                        className="w-5 h-5 rounded border-border text-primary accent-primary cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold truncate", task.completed && "line-through text-muted-foreground")}>
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
                            isPinned ? "text-clay bg-clay/15" : "text-muted-foreground/30 hover:text-clay opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Star size={14} fill={isPinned ? "currentColor" : "none"} />
                        </button>
                        <span className={cn("text-[9px] font-black px-2 py-1 rounded-md uppercase", cfg.bg, cfg.text)}>
                          {cfg.label}
                        </span>
                        <button onClick={() => deleteTask(task.id, task.projectId)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/50 hover:text-destructive transition-all">
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
          {/* TODAY'S FOCUS CARD — doubles as a small calendar widget */}
          <div className="bg-card p-6 rounded-[32px] border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-clay/15 flex flex-col items-center justify-center shrink-0">
                <span className="text-[8px] font-black uppercase text-clay tracking-widest leading-none pt-1.5">{monthShortLabel}</span>
                <span className="text-lg font-black text-clay leading-none mt-0.5">{dateOfMonth}</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">Today's Focus</h4>
                <p className="text-[11px] text-muted-foreground truncate">{weekdayLabel} · Top priorities</p>
                {holidayLabel && (
                  <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wide text-clay bg-clay/10 px-1.5 py-0.5 rounded-full truncate max-w-full">
                    {holidayLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {focusTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No focus tasks identified.</p>
              ) : (
                focusTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl border border-border group">
                    <div className={`w-1 h-6 rounded-full ${PRIORITY_MAP[task.normPriority as keyof typeof PRIORITY_MAP]?.tailwind}`} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-bold truncate", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                      <p className="text-[9px] font-black text-clay uppercase tracking-tighter">{task.projectName}</p>
                    </div>
                    <button onClick={() => toggleTask(task.id, task.projectId)}>
                      <CheckCircle2 size={18} className={task.completed ? "text-slate-blue" : "text-muted-foreground/30 hover:text-muted-foreground"} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {state.focusTaskIds?.length > 0 && (
              <button 
                onClick={() => setState((p:any) => ({...p, focusTaskIds: []}))}
                className="text-[9px] font-black text-clay uppercase tracking-widest w-full pt-2 hover:underline"
              >
                Reset to Auto-Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function StatCard({ label, value, sub, dotColor, accent }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
        <span className={cn("text-[10px] font-bold", accent)}>{sub}</span>
      </div>
    </div>
  );
}