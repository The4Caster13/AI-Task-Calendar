import { useMemo } from "react";
import {
  CheckSquare, Flame, FolderOpen, Target, Check
} from "lucide-react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { Toaster } from "sonner";
import { cn, formatDueDate } from "@/lib/utils";

const DUE_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-red-500/10 text-red-500",
  today: "bg-amber-500/10 text-amber-500",
  upcoming: "bg-muted text-muted-foreground",
};

// ─── Mock chart data (weekly output history isn't tracked yet) ─────────────
const WEEKLY_DATA = [
  { day: "Mon", tasks: 8, hours: 6.5 }, { day: "Tue", tasks: 12, hours: 7.2 },
  { day: "Wed", tasks: 6, hours: 5.8 }, { day: "Thu", tasks: 15, hours: 8.1 },
  { day: "Fri", tasks: 11, hours: 7.5 }, { day: "Sat", tasks: 4, hours: 3.2 },
  { day: "Sun", tasks: 2, hours: 1.5 },
];

const PROGRESS_DATA = [
  { week: "W1", completed: 34 }, { week: "W2", completed: 41 },
  { week: "W3", completed: 38 }, { week: "W4", completed: 52 },
  { week: "W5", completed: 47 }, { week: "W6", completed: 58 },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard({ state: globalState, setState }: { state: any; setState: any }) {
  const goals: any[] = Array.isArray(globalState?.goals) ? globalState.goals : [];

  const allTasks = useMemo(() => (
    goals.flatMap((g: any) => (g.tasks ?? []).map((t: any) => ({
      ...t, projectId: g.id, projectTitle: g.title, projectColor: g.color,
    })))
  ), [goals]);

  // "Today's Tasks" = anything overdue, due today, undated, or completed today.
  const relevantTasks = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayStart.getDate() + 1);
    return allTasks
      .filter((t: any) => (
        t.completed
          ? t.completedAt >= todayStart.getTime() && t.completedAt < todayEnd.getTime()
          : !t.dueDate || t.dueDate < todayEnd.getTime()
      ))
      .sort((a: any, b: any) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity);
      });
  }, [allTasks]);

  const toggleTask = (taskId: string, projectId: string) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id === projectId
          ? { ...g, tasks: g.tasks.map((t: any) => (t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t)) }
          : g
      )),
    }));
  };

  const completedToday = relevantTasks.filter((t: any) => t.completed).length;
  const totalToday = relevantTasks.length;
  const completionPct = Math.round((completedToday / totalToday) * 100) || 0;

  const activeCount = goals.filter((g: any) => (g.status ?? "active") !== "completed").length;
  const pausedCount = goals.length - activeCount;
  const activePct = goals.length > 0 ? Math.round((activeCount / goals.length) * 100) : 0;

  const projectCards = useMemo(() => goals.map((g: any) => {
    const gTasks = g.tasks ?? [];
    const done = gTasks.filter((t: any) => t.completed).length;
    const total = gTasks.length;
    return {
      id: g.id,
      name: g.title,
      description: g.description,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      status: g.status ?? "active",
      deadline: g.deadline,
      tasksTotal: total,
      tasksDone: done,
      color: g.color || "#6366f1",
    };
  }), [goals]);

  // Duration awareness: for each project with a deadline, how much of its
  // available time has elapsed vs. how much of its work is actually done.
  const projectTimelines = useMemo(() => {
    const now = Date.now();
    return goals
      .filter((g: any) => g.deadline)
      .map((g: any) => {
        const start = g.createdAt ?? g.deadline;
        const span = Math.max(g.deadline - start, 1);
        const timePct = Math.min(Math.max(((now - start) / span) * 100, 0), 100);
        const gTasks = g.tasks ?? [];
        const done = gTasks.filter((t: any) => t.completed).length;
        const total = gTasks.length;
        const taskPct = total > 0 ? (done / total) * 100 : 0;
        const daysLeft = Math.ceil((g.deadline - now) / 86400000);
        return { id: g.id, title: g.title, color: g.color || "#6366f1", timePct, taskPct, daysLeft, done, total };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [goals]);

  return (
    <div className="w-full bg-transparent text-foreground">
      <Toaster theme="dark" position="top-center" />

      {/* MAIN CONTENT AREA (Removed aside, header, and ScrollArea because App.js provides them) */}
      <div className="max-w-[1200px] mx-auto p-8 space-y-8 pb-32">

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="TASKS TODAY" value={`${completedToday}/${totalToday}`} sub={`${completionPct}% complete`} Icon={CheckSquare} fill={completionPct} />
            <StatCard label="ACTIVE PROJECTS" value={String(activeCount)} sub={`${pausedCount} paused`} Icon={FolderOpen} fill={activePct} />
            <StatCard label="DAY STREAK" value="14" sub="+2 vs last week" Icon={Flame} fill={93} />
            <StatCard label="WEEKLY OUTPUT" value="58 tasks" sub="7h 12m avg/day" Icon={Target} fill={82} />
          </div>

          {/* Content Grid: Projects & Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Projects List (3 Cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Projects</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{projectCards.length} TOTAL</span>
              </div>
              {projectCards.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No projects yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectCards.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              )}
            </div>

            {/* Today's Tasks (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Today's Tasks</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{completedToday} DONE</span>
              </div>
              <div className="space-y-2">
                {relevantTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">Nothing due today. ✓</p>
                ) : (
                  relevantTasks.map((t: any) => (
                    <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id, t.projectId)} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Project Timelines: elapsed time vs. actual completion, per deadline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Project Timelines</h2>
              <span className="text-[10px] font-mono text-muted-foreground">TIME ELAPSED VS. DONE</span>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
              {projectTimelines.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 text-center">No project deadlines set yet.</p>
              ) : (
                projectTimelines.map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold">{p.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground">{p.done}/{p.total} tasks</span>
                        <span className={cn("text-[10px] font-black uppercase", p.daysLeft < 0 ? "text-destructive" : "text-muted-foreground")}>
                          {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d overdue` : p.daysLeft === 0 ? "Due today" : `${p.daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-full opacity-30 transition-all duration-1000"
                        style={{ width: `${p.timePct}%`, background: p.color }}
                      />
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                        style={{ width: `${p.taskPct}%`, background: p.color }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-sm font-semibold mb-6">Weekly Activity</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WEEKLY_DATA}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#111', border: 'none', borderRadius: '8px', fontSize: '10px'}} />
                  <Bar dataKey="tasks" fill="rgba(0,212,255,0.7)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hours" fill="rgba(57,255,20,0.5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-sm font-semibold">Completion Trend</h2>
                 <span className="text-[10px] font-mono text-accent">+70% vs W1</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={PROGRESS_DATA}>
                  <defs>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" hide />
                  <Area type="monotone" dataKey="completed" stroke="#00d4ff" fill="url(#colorComp)" strokeWidth={2} dot={{r: 4, fill: '#00d4ff'}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, fill }: any) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        <Icon className="w-4 h-4 text-primary opacity-70" />
      </div>
      <p className="text-3xl font-black mb-1 tracking-tighter">{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mb-4">{sub}</p>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const due = formatDueDate(project.deadline);
  return (
    <div className="p-5 rounded-2xl bg-card border border-border hover:bg-muted/10 transition-all cursor-pointer group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: project.color }} />
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{project.status}</span>
        </div>
        {due && (
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase", DUE_TONE_CLASSES[due.tone])}>
            Due {due.label}
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold truncate mb-1">{project.name}</h3>
      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-4">{project.description}</p>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black" style={{ color: project.color }}>{project.progress}%</span>
        <span className="text-[10px] text-muted-foreground font-mono">{project.tasksDone}/{project.tasksTotal}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full transition-all duration-1000" style={{ width: `${project.progress}%`, background: project.color }} />
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle }: { task: any; onToggle: () => void }) {
  const due = formatDueDate(task.dueDate);
  return (
    <button onClick={onToggle} className={cn(
      "w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all text-left",
      task.completed ? "bg-muted/5 border-transparent opacity-40" : "bg-card border-border hover:border-primary/30"
    )}>
      <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0", task.completed ? "bg-primary border-primary" : "border-border")}>
        {task.completed && <Check size={12} className="text-primary-foreground" strokeWidth={4} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold truncate", task.completed && "line-through")}>{task.title}</p>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter mt-0.5">{task.projectTitle}</p>
      </div>
      {due && (
        <span className={cn("text-[9px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap shrink-0", DUE_TONE_CLASSES[due.tone])}>
          {due.label}
        </span>
      )}
    </button>
  );
}
