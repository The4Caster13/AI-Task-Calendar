import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare, FolderOpen, Target, Check
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { Toaster } from "sonner";
import { cn, formatDueDate } from "@/lib/utils";
import { STAGGER_CONTAINER, FADE_UP_ITEM } from "@/lib/motion";
import { getCompanionPace } from "@/lib/companionPace";
import { buildProjectTimeline } from "@/lib/projectTimeline";
import { getAllTasks, toggleTaskInState } from "@/lib/tasks";
import {
  CampfireCompanion, CliffhangerCompanion, BuilderCompanion,
  TaskPeekCharacter, TaskJumperCharacter, TaskSmokePuffs, useTaskCompanionSequence,
} from "@/src/mushroom-companions";

const DUE_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-clay/15 text-clay",
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

type CompletionModeId = "today" | "week" | "month" | "projects" | "all";

const COMPLETION_TABS: { id: CompletionModeId; label: string }[] = [
  { id: "today", label: "Due Today" },
  { id: "week", label: "Due This Week" },
  { id: "month", label: "Due This Month" },
  { id: "projects", label: "Projects" },
  { id: "all", label: "All Tasks" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard({ state: globalState, setState, zenMode = false, speed = 1 }: { state: any; setState: any; zenMode?: boolean; speed?: number }) {
  const goals: any[] = Array.isArray(globalState?.goals) ? globalState.goals : [];
  const [completionMode, setCompletionMode] = useState<CompletionModeId>("today");
  // Day Streak / Weekly Output aren't tracked from real data yet (see the
  // hardcoded StatCard values below) — these mirror those same mock numbers
  // so the campfire/cliff characters react to whatever the card displays.
  const dayStreak = 14;
  const weeklyOutputFill = 82;
  // How much work the user wants to do in a given period — controls when the
  // companions consider that "enough" (Settings → Companion Pace).
  const companionPace = getCompanionPace(globalState?.settings);

  const allTasks = useMemo(() => getAllTasks(globalState), [goals, globalState?.tasks]);

  // Universal completion bar: every task (or project) counts equally — no
  // weighting by the task.weight field or by how many tasks a project has.
  // "Due Today/Week/Month" scope by due date, rolling in overdue and
  // undated tasks (they need attention now, same as the Today's Tasks widget).
  // "Projects" averages each project's own % equally, regardless of task count.
  const completionBuckets = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const dayMs = 86400000;

    const dueWithin = (days: number) => {
      const cutoff = todayStart.getTime() + days * dayMs;
      const scoped = allTasks.filter((t: any) => !t.dueDate || t.dueDate < cutoff);
      return { done: scoped.filter((t: any) => t.completed).length, total: scoped.length };
    };

    const projectPcts = goals
      .map((g: any) => {
        const gTasks = g.tasks ?? [];
        if (gTasks.length === 0) return null;
        return (gTasks.filter((t: any) => t.completed).length / gTasks.length) * 100;
      })
      .filter((p: number | null): p is number => p !== null);

    return {
      today: dueWithin(1),
      week: dueWithin(7),
      month: dueWithin(30),
      all: { done: allTasks.filter((t: any) => t.completed).length, total: allTasks.length },
      projects: {
        pct: projectPcts.length > 0 ? Math.round(projectPcts.reduce((sum: number, p: number) => sum + p, 0) / projectPcts.length) : 0,
        count: projectPcts.length,
      },
    };
  }, [allTasks, goals]);

  const activeBucket = completionBuckets[completionMode];
  const universalPct = completionMode === "projects"
    ? (activeBucket as { pct: number; count: number }).pct
    : Math.round((((activeBucket as { done: number; total: number }).done / (activeBucket as { done: number; total: number }).total) * 100) || 0);

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

  const toggleTask = (taskId: string, projectId: string | null) => {
    setState((prev: any) => toggleTaskInState(prev, taskId, projectId));
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
    const timeline = buildProjectTimeline(g);
    return {
      id: g.id,
      name: g.title,
      description: g.description,
      // Weighted by each task's 1-10 weight field, not a flat per-task count —
      // a heavier task finishing moves this more than a light one.
      progress: timeline.progressPct,
      status: g.status ?? "active",
      deadline: g.deadline,
      tasksTotal: total,
      tasksDone: done,
      color: g.color || "#BC7B6F",
      timeline,
    };
  }), [goals]);

  return (
    <div className="w-full bg-transparent text-foreground">
      <Toaster theme="dark" position="top-center" />

      {/* MAIN CONTENT AREA (Removed aside, header, and ScrollArea because App.js provides them) */}
      <div className="max-w-[1200px] mx-auto p-8 space-y-8 pb-32">

          {/* Universal Completion Bar — the app's central metric. No card box:
              sits directly on the page so it reads as the dashboard's spine,
              not another widget in the card grid. */}
          <div className="space-y-5 pb-6 border-b border-border">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Overall Completion</h2>
                <p className="text-5xl font-black tracking-tighter text-foreground leading-none">
                  {universalPct}<span className="text-2xl text-muted-foreground">%</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMPLETION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCompletionMode(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border",
                      completionMode === tab.id
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "text-muted-foreground border-border hover:border-primary/30"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative h-5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${universalPct}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              {completionMode === "projects"
                ? `${(activeBucket as { pct: number; count: number }).count} project${(activeBucket as { pct: number; count: number }).count === 1 ? "" : "s"} tracked`
                : `${(activeBucket as { done: number; total: number }).done}/${(activeBucket as { done: number; total: number }).total} tasks`}
            </p>
          </div>

          {/* Stats Row — extra top padding gives the edge-anchored companions
              (builder, cliff-hanger) room to poke up above their cards. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-14">
            <StatCard label="TASKS TODAY" value={`${completedToday}/${totalToday}`} sub={`${completionPct}% complete`} Icon={CheckSquare} fill={completionPct} />
            <StatCard
              label="ACTIVE PROJECTS" value={String(activeCount)} sub={`${pausedCount} paused`} Icon={FolderOpen} fill={activePct}
              character={<BuilderCompanion zenMode={zenMode} speed={speed} />}
            />
            <StatCard
              label="DAY STREAK" value="14" sub="+2 vs last week" fill={93}
              character={<CampfireCompanion streakDays={dayStreak} streakGoalDays={companionPace.streakGoalDays} zenMode={zenMode} speed={speed} />}
            />
            <StatCard
              label="WEEKLY OUTPUT" value="58 tasks" sub="7h 12m avg/day" Icon={Target} fill={weeklyOutputFill}
              character={<CliffhangerCompanion isHighOutput={weeklyOutputFill >= companionPace.weeklyOutputGoalPct} zenMode={zenMode} speed={speed} />}
            />
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
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  variants={STAGGER_CONTAINER}
                  initial="hidden"
                  animate="visible"
                >
                  {projectCards.map((p) => (
                    <motion.div key={p.id} variants={FADE_UP_ITEM}>
                      <ProjectCard project={p} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Today's Tasks (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Today's Tasks</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{completedToday} DONE</span>
              </div>
              <motion.div className="space-y-2" variants={STAGGER_CONTAINER} initial="hidden" animate="visible">
                {relevantTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">Nothing due today. ✓</p>
                ) : (
                  relevantTasks.map((t: any) => (
                    <motion.div key={t.id} variants={FADE_UP_ITEM}>
                      <TaskItem task={t} onToggle={() => toggleTask(t.id, t.projectId)} zenMode={zenMode} speed={speed} />
                    </motion.div>
                  ))
                )}
              </motion.div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-sm font-semibold mb-6">Weekly Activity</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WEEKLY_DATA}>
                  <CartesianGrid vertical={false} stroke="#DDD9D0" strokeDasharray="3 3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#8A6F63'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#8A6F63'}} width={28} allowDecimals={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#5A322A', border: 'none', borderRadius: '8px', fontSize: '10px', color: '#FBF3EF'}} />
                  <Bar dataKey="tasks" fill="rgba(188,123,111,0.75)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hours" fill="rgba(113,138,158,0.55)" radius={[4, 4, 0, 0]} />
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
                      <stop offset="5%" stopColor="#718A9E" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#718A9E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#DDD9D0" strokeDasharray="3 3" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#8A6F63'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#8A6F63'}} width={28} allowDecimals={false} />
                  <Area type="monotone" dataKey="completed" stroke="#718A9E" fill="url(#colorComp)" strokeWidth={2} dot={{r: 4, fill: '#718A9E'}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, fill, character, iconScale = 1 }: any) {
  return (
    <div className="relative overflow-visible p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        {Icon && (
          <motion.div animate={{ scale: iconScale }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <Icon className="w-4 h-4 text-primary opacity-70" />
          </motion.div>
        )}
      </div>
      <p className="text-3xl font-black mb-1 tracking-tighter">{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mb-4">{sub}</p>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${fill}%` }} />
      </div>
      {character}
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const due = formatDueDate(project.deadline);
  const timeline = project.timeline;
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

      {/* Timeline: solid fill shows the project's weighted completion %
          (same number as the label above), and each task gets its own
          milestone dot positioned at its (real or estimated) due date —
          solid once done, hollow while pending. Dots that would land too
          close together are nudged apart so they don't stack. */}
      <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden" title={`${project.tasksDone}/${project.tasksTotal} tasks complete`}>
        <div
          className="absolute top-0 left-0 h-full opacity-25 transition-all duration-1000"
          style={{ width: `${project.progress}%`, background: project.color }}
        />
      </div>
      <div className="relative h-4 w-full -mt-4">
        {timeline.tasks.map((t: any) => (
          <div
            key={t.id}
            title={`${t.title} — ${t.completed ? "Done" : "Pending"}${t.estimated ? " (estimated date)" : ""}`}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all",
              t.completed ? "border-2 border-card" : "border-2 bg-card"
            )}
            style={{
              left: `calc(${t.leftPct}% - 5px)`,
              background: t.completed ? project.color : undefined,
              borderColor: project.color,
            }}
          />
        ))}
      </div>
      {timeline.range.estimated && (
        <p className="text-[9px] text-muted-foreground font-mono mt-1.5 italic">Estimated timeline — no deadline set</p>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, zenMode, speed = 1 }: { task: any; onToggle: () => void; zenMode: boolean; speed?: number }) {
  const due = formatDueDate(task.dueDate);
  const { phase, trigger, reset } = useTaskCompanionSequence(!!task.completed, onToggle, speed);

  const handleBoxClick = (e: any) => {
    e.stopPropagation();
    if (task.completed) {
      reset();
      onToggle();
    } else {
      trigger();
    }
  };

  return (
    <div
      className={cn(
        "mc-root mc-task-row relative w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
        task.completed ? "bg-muted/20 border-transparent opacity-40" : "bg-muted/50 border-border hover:border-primary/30"
      )}
      style={{ "--speed": speed } as any}
      data-mc-phase={zenMode ? "idle" : phase}
    >
      <button
        type="button"
        onClick={handleBoxClick}
        className={cn("relative w-5 h-5 rounded-md border flex items-center justify-center shrink-0", task.completed ? "bg-primary border-primary" : "border-border")}
      >
        {task.completed && <Check size={12} className="text-primary-foreground" strokeWidth={4} />}
        {!zenMode && <TaskPeekCharacter />}
      </button>
      <span className="mc-task-label-wrap flex-1 min-w-0">
        <p className={cn("text-xs font-bold truncate", task.completed && "line-through")}>{task.title}</p>
        <p className="text-[9px] font-black text-clay uppercase tracking-tighter mt-0.5">{task.projectTitle}</p>
      </span>
      {due && (
        <span className={cn("text-[9px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap shrink-0", DUE_TONE_CLASSES[due.tone])}>
          {due.label}
        </span>
      )}
      {!zenMode && (
        <>
          <TaskJumperCharacter />
          <TaskSmokePuffs />
        </>
      )}
    </div>
  );
}
