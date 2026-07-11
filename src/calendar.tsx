import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Flag, CalendarDays,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProjectRange, deriveTaskDates } from "@/lib/projectTimeline";
import { toggleTaskInState, addTaskToState } from "@/lib/tasks";

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

export default function Calendar({ state, setState }: { state: any; setState: any }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState(false);

  const goals: any[] = Array.isArray(state?.goals) ? state.goals : [];

  const shiftMonth = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };
  const shiftYear = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear() + delta, d.getMonth(), 1));
  };
  const goToday = () => setViewDate(new Date());

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
    // Unassigned tasks have no project range to estimate a date from, so
    // only ones with a real due date show up on the calendar.
    for (const t of (state?.tasks ?? [])) {
      if (typeof t.dueDate !== "number") continue;
      const key = dateKey(new Date(t.dueDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...t, estimated: false, projectId: null, projectTitle: "No Project", projectColor: undefined });
    }
    return map;
  }, [goals, goalMeta, state?.tasks]);

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

  const toggleTask = (taskId: string, projectId: string | null) => {
    setState((prev: any) => toggleTaskInState(prev, taskId, projectId));
  };

  const openAddTask = (day: Date) => {
    setAddTaskDate(day);
    setNewTaskTitle("");
    setNewTaskPriority(false);
    setNewTaskProjectId("");
  };

  const submitAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title || !addTaskDate) return;
    const newTask = {
      id: crypto.randomUUID(),
      title,
      weight: 3,
      completed: false,
      isPriority: newTaskPriority,
      dueDate: addTaskDate.getTime(),
    };
    setState((prev: any) => addTaskToState(prev, newTaskProjectId || null, newTask));
    setAddTaskDate(null);
  };

  const today = new Date();

  return (
    <div className="w-full p-8 space-y-6 pb-32">
      <div>
        <h1 className="text-3xl font-black text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">View deadlines and add tasks to your projects.</p>
      </div>

      <div className="bg-card rounded-3xl shadow-sm border border-border p-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            <button onClick={() => shiftYear(-1)} aria-label="Previous year" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronsLeft size={16} />
            </button>
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-muted-foreground" />
            <h2 className="text-lg font-black text-foreground min-w-[160px] text-center">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button onClick={goToday} className="text-[10px] font-black uppercase tracking-widest text-clay hover:underline">
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => shiftYear(1)} aria-label="Next year" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-3 text-center text-sm font-bold text-muted-foreground mb-4">
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
                  inMonth ? "border-border bg-muted/40 hover:bg-muted" : "border-transparent bg-transparent opacity-40"
                )}
              >
                <div className="flex items-center justify-between shrink-0">
                  <span
                    className={cn(
                      "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground/80"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {inMonth && (
                    <button
                      onClick={() => openAddTask(day)}
                      aria-label="Add task"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-card border border-border hover:border-clay/50 text-muted-foreground hover:text-clay"
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
                          g.estimated ? "bg-clay/10 text-clay border border-dashed border-clay/40" : "bg-clay/20 text-espresso"
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
                          ? "bg-muted text-muted-foreground line-through"
                          : t.estimated
                            ? "bg-card border border-dashed border-border text-muted-foreground hover:border-clay/50"
                            : "bg-card border border-border text-foreground/80 hover:border-clay/50"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.projectColor || "#BC7B6F" }} />
                      <span className="truncate">{t.estimated ? "~" : ""}{t.title}</span>
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <p className="text-[8px] font-black text-muted-foreground uppercase pl-1">+{overflowCount} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add task dialog */}
      <Dialog open={addTaskDate !== null} onOpenChange={(open) => !open && setAddTaskDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add task {addTaskDate ? `— ${MONTH_NAMES[addTaskDate.getMonth()]} ${addTaskDate.getDate()}, ${addTaskDate.getFullYear()}` : ""}
            </DialogTitle>
          </DialogHeader>
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
              <option value="">No Project</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.checked)} />
              Mark as high priority
            </label>
          </div>
          <DialogFooter>
            <Button onClick={submitAddTask} className="w-full bg-primary text-primary-foreground">Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
