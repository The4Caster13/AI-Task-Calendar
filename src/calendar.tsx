import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Flag, CalendarDays,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(viewDate: Date): Date[] {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const DAY_MS = 86400000;
const DEFAULT_PROJECT_DURATION_DAYS = 14;

// Every project needs a date range to appear on the calendar. If it has no
// real deadline, give it an estimated one (createdAt + a default duration)
// so it still shows up rather than being silently dropped.
function getProjectRange(g: any): { start: number; end: number; estimated: boolean } {
  const start = typeof g.createdAt === "number" ? g.createdAt : Date.now();
  const hasDeadline = typeof g.deadline === "number" && Number.isFinite(g.deadline);
  const end = hasDeadline ? g.deadline : start + DEFAULT_PROJECT_DURATION_DAYS * DAY_MS;
  return { start, end: Math.max(end, start + DAY_MS), estimated: !hasDeadline };
}

// Every task needs a date too. Tasks without a real due date get one spread
// evenly across the project's range (between today and its deadline), so
// the whole project's workload is visible on the calendar instead of vanishing.
function deriveTaskDates(g: any, range: { start: number; end: number }): Map<string, number> {
  const tasks: any[] = g.tasks ?? [];
  const undated = tasks.filter((t) => typeof t.dueDate !== "number");
  const spreadStart = Math.max(range.start, Date.now());
  const spreadEnd = Math.max(range.end, spreadStart + DAY_MS);
  const map = new Map<string, number>();
  const n = undated.length;
  undated.forEach((t, i) => {
    const frac = n === 1 ? 1 : i / (n - 1);
    map.set(t.id, Math.round(spreadStart + frac * (spreadEnd - spreadStart)));
  });
  return map;
}

export default function Calendar({ state, setState }: { state: any; setState: any }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState(false);
  const wheelLockRef = useRef(false);

  const goals: any[] = Array.isArray(state?.goals) ? state.goals : [];

  const shiftMonth = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };
  const shiftYear = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear() + delta, d.getMonth(), 1));
  };
  const goToday = () => setViewDate(new Date());

  const handleWheel = (e: any) => {
    if (wheelLockRef.current || Math.abs(e.deltaY) < 12) return;
    wheelLockRef.current = true;
    shiftMonth(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLockRef.current = false; }, 350);
  };

  const grid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  // Per-project range (real deadline, or an estimated one) and per-task
  // derived due dates (real, or spread evenly across the project's range).
  // This guarantees every project and every task lands somewhere on the
  // calendar instead of silently disappearing when a date isn't set.
  const goalMeta = useMemo(() => {
    const map = new Map<string, { range: { start: number; end: number; estimated: boolean }; taskDates: Map<string, number> }>();
    for (const g of goals) {
      const range = getProjectRange(g);
      map.set(g.id, { range, taskDates: deriveTaskDates(g, range) });
    }
    return map;
  }, [goals]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const g of goals) {
      const meta = goalMeta.get(g.id)!;
      for (const t of g.tasks ?? []) {
        const hasRealDate = typeof t.dueDate === "number";
        const dueDate = hasRealDate ? t.dueDate : meta.taskDates.get(t.id)!;
        const key = dateKey(new Date(dueDate));
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ ...t, dueDate, estimated: !hasRealDate, projectId: g.id, projectTitle: g.title, projectColor: g.color });
      }
    }
    return map;
  }, [goals, goalMeta]);

  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const g of goals) {
      const meta = goalMeta.get(g.id)!;
      const key = dateKey(new Date(meta.range.end));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...g, estimated: meta.range.estimated });
    }
    return map;
  }, [goals, goalMeta]);

  // Projects whose active window (createdAt → deadline, real or estimated)
  // overlaps the viewed month, rendered as a Gantt-style timeline strip
  // beneath the grid.
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const totalDays = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth(), totalDays, 23, 59, 59);

  const timelineProjects = useMemo(() => {
    return goals
      .map((g) => {
        const meta = goalMeta.get(g.id)!;
        const start = Math.max(meta.range.start, monthStart.getTime());
        const end = Math.min(meta.range.end, monthEnd.getTime());
        if (end < monthStart.getTime() || meta.range.start > monthEnd.getTime()) return null;
        const startDay = new Date(start).getDate();
        const endDay = new Date(end).getDate();
        const leftPct = ((startDay - 1) / totalDays) * 100;
        const widthPct = Math.max(((endDay - startDay + 1) / totalDays) * 100, 100 / totalDays);
        const tasks = g.tasks ?? [];
        const done = tasks.filter((t: any) => t.completed).length;
        return { ...g, leftPct, widthPct, done, total: tasks.length, estimated: meta.range.estimated };
      })
      .filter(Boolean) as any[];
  }, [goals, goalMeta, viewDate]);

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

  const openAddTask = (day: Date) => {
    setAddTaskDate(day);
    setNewTaskTitle("");
    setNewTaskPriority(false);
    setNewTaskProjectId(goals[0]?.id ?? "");
  };

  const submitAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title || !addTaskDate || goals.length === 0) return;
    const projectId = newTaskProjectId || goals[0].id;
    const newTask = {
      id: crypto.randomUUID(),
      title,
      weight: 3,
      completed: false,
      isPriority: newTaskPriority,
      dueDate: addTaskDate.getTime(),
    };
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id === projectId ? { ...g, tasks: [...(g.tasks ?? []), newTask], updatedAt: Date.now() } : g
      )),
    }));
    setAddTaskDate(null);
  };

  const today = new Date();

  return (
    <div className="w-full p-8 space-y-6 pb-32">
      <div>
        <h1 className="text-3xl font-black text-black">Calendar</h1>
        <p className="text-gray-500 mt-1">View deadlines, add tasks, and track project timelines.</p>
      </div>

      <div
        className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6"
        onWheel={handleWheel}
      >
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            <button onClick={() => shiftYear(-1)} aria-label="Previous year" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronsLeft size={16} />
            </button>
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-gray-400" />
            <h2 className="text-lg font-black text-black min-w-[160px] text-center">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button onClick={goToday} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => shiftYear(1)} aria-label="Next year" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-3 text-center text-sm font-bold text-gray-500 mb-4">
          {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-3">
          {grid.map((day, i) => {
            const inMonth = day.getMonth() === viewDate.getMonth();
            const isToday = isSameDay(day, today);
            const dayTasks = tasksByDay.get(dateKey(day)) ?? [];
            const dayDeadlines = deadlinesByDay.get(dateKey(day)) ?? [];
            const visibleTasks = dayTasks.slice(0, 3);
            const overflowCount = dayTasks.length - visibleTasks.length;

            return (
              <div
                key={i}
                className={cn(
                  "group relative h-28 rounded-2xl border p-2 transition flex flex-col gap-1 overflow-hidden",
                  inMonth ? "border-gray-200 bg-gray-50 hover:bg-gray-100" : "border-transparent bg-transparent opacity-40"
                )}
              >
                <div className="flex items-center justify-between shrink-0">
                  <span
                    className={cn(
                      "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-indigo-600 text-white" : "text-gray-700"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {inMonth && (
                    <button
                      onClick={() => openAddTask(day)}
                      aria-label="Add task"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white border border-gray-200 hover:border-indigo-300 text-gray-500 hover:text-indigo-600"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>

                {dayDeadlines.length > 0 && (
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {dayDeadlines.map((g) => (
                      <span
                        key={g.id}
                        title={`${g.title} deadline${g.estimated ? " (estimated — no deadline set)" : ""}`}
                        className={cn(
                          "flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full truncate max-w-full",
                          g.estimated ? "bg-amber-50 text-amber-500 border border-dashed border-amber-300" : "bg-amber-100 text-amber-700"
                        )}
                      >
                        <Flag size={8} /> {g.estimated ? "~" : ""}{g.title}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-0.5 overflow-hidden">
                  {visibleTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTask(t.id, t.projectId)}
                      title={`${t.title}${t.estimated ? " (estimated date — no due date set)" : ""}`}
                      className={cn(
                        "w-full flex items-center gap-1 text-[9px] font-bold text-left px-1.5 py-0.5 rounded-md truncate",
                        t.completed
                          ? "bg-gray-100 text-gray-400 line-through"
                          : t.estimated
                            ? "bg-white border border-dashed border-gray-300 text-gray-500 hover:border-indigo-300"
                            : "bg-white border border-gray-200 text-gray-700 hover:border-indigo-300"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.projectColor || "#6366f1" }} />
                      <span className="truncate">{t.estimated ? "~" : ""}{t.title}</span>
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <p className="text-[8px] font-black text-gray-400 uppercase pl-1">+{overflowCount} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project timelines for the viewed month */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
          Timelines — {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h2>
        {timelineProjects.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-4 text-center">No project timelines fall within this month.</p>
        ) : (
          <div className="space-y-4">
            {timelineProjects.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-black">
                    {p.title}
                    {p.estimated && <span className="ml-2 text-[9px] font-black uppercase text-amber-500">estimated timeline</span>}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{p.done}/{p.total} done</span>
                </div>
                <div className={cn("relative h-3 w-full bg-gray-100 rounded-full overflow-hidden", p.estimated && "border border-dashed border-amber-300")}>
                  <div
                    className={cn("absolute top-0 h-full rounded-full", p.estimated ? "opacity-15" : "opacity-25")}
                    style={{ left: `${p.leftPct}%`, width: `${p.widthPct}%`, background: p.color || "#6366f1" }}
                  />
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${p.leftPct}%`,
                      width: `${p.total > 0 ? (p.widthPct * p.done) / p.total : 0}%`,
                      background: p.color || "#6366f1",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add task dialog */}
      <Dialog open={addTaskDate !== null} onOpenChange={(open) => !open && setAddTaskDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add task {addTaskDate ? `— ${MONTH_NAMES[addTaskDate.getMonth()]} ${addTaskDate.getDate()}, ${addTaskDate.getFullYear()}` : ""}
            </DialogTitle>
          </DialogHeader>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create a project first before adding tasks to the calendar.</p>
          ) : (
            <div className="grid gap-3 py-2">
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAddTask()}
                autoFocus
              />
              <select
                value={newTaskProjectId}
                onChange={(e) => setNewTaskProjectId(e.target.value)}
                className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none"
              >
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.checked)} />
                Mark as high priority
              </label>
            </div>
          )}
          {goals.length > 0 && (
            <DialogFooter>
              <Button onClick={submitAddTask} className="w-full bg-black">Add Task</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
