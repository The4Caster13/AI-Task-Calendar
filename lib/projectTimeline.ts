export const DAY_MS = 86400000;
const DEFAULT_PROJECT_DURATION_DAYS = 14;

export interface ProjectRange {
  start: number;
  end: number;
  estimated: boolean;
}

// Every project needs a date range to appear on a timeline. If it has no
// real deadline, give it an estimated one (createdAt + a default duration)
// so it still shows up rather than being silently dropped.
export function getProjectRange(g: any): ProjectRange {
  const start = typeof g.createdAt === "number" ? g.createdAt : Date.now();
  const hasDeadline = typeof g.deadline === "number" && Number.isFinite(g.deadline);
  const end = hasDeadline ? g.deadline : start + DEFAULT_PROJECT_DURATION_DAYS * DAY_MS;
  return { start, end: Math.max(end, start + DAY_MS), estimated: !hasDeadline };
}

// Every task needs a date too. Tasks without a real due date get one spread
// evenly across the project's range (between today and its deadline), so
// the whole project's workload is visible on a timeline instead of vanishing.
export function deriveTaskDates(g: any, range: { start: number; end: number }): Map<string, number> {
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

export interface TimelineTask {
  id: string;
  title: string;
  completed: boolean;
  isPriority: boolean;
  weight: number;
  dueDate: number;
  estimated: boolean;
  leftPct: number;
}

export interface ProjectTimeline {
  range: ProjectRange;
  tasks: TimelineTask[];
  progressPct: number; // weighted completion, 0-100
}

// Each task counts toward completion proportional to its weight (1-10, see
// Task.weight), not just as one-of-many — a weight-8 task finishing moves
// the needle more than a weight-1 task. Tasks without a weight count as 1.
export function getWeightedProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const totalWeight = tasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
  if (totalWeight <= 0) return 0;
  const doneWeight = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
  return Math.round((doneWeight / totalWeight) * 100);
}

// Nudges positions (0-100 scale) apart so dots for tasks with close or
// identical dates don't render stacked on top of each other. Pushes later
// items right first, then pulls back from the end if that ran past 100, and
// finally insets the whole set slightly so nothing sits flush on the track's
// rounded edges.
function spreadPositions(rawPct: number[], minGapPct = 6): number[] {
  const order = rawPct.map((_, i) => i).sort((a, b) => rawPct[a] - rawPct[b]);
  const positions = [...rawPct];

  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1];
    const cur = order[k];
    if (positions[cur] - positions[prev] < minGapPct) {
      positions[cur] = positions[prev] + minGapPct;
    }
  }
  for (let k = order.length - 1; k > 0; k--) {
    const cur = order[k];
    const prev = order[k - 1];
    if (positions[cur] > 100) positions[cur] = 100;
    if (positions[cur] - positions[prev] < minGapPct) {
      positions[prev] = positions[cur] - minGapPct;
    }
  }

  return positions.map((p) => Math.min(97, Math.max(3, p)));
}

// Builds everything a timeline bar needs for one project: its date range,
// each task positioned along that range (real due date, or an estimated one
// spread evenly, then spaced apart so close dates don't overlap), and the
// project's weighted completion percentage.
export function buildProjectTimeline(g: any): ProjectTimeline {
  const range = getProjectRange(g);
  const taskDates = deriveTaskDates(g, range);
  const span = Math.max(range.end - range.start, 1);
  const rawTasks = g.tasks ?? [];

  const dated = rawTasks.map((t: any) => {
    const hasRealDate = typeof t.dueDate === "number";
    const dueDate = hasRealDate ? t.dueDate : taskDates.get(t.id)!;
    const rawPct = Math.min(100, Math.max(0, ((dueDate - range.start) / span) * 100));
    return { t, dueDate, estimated: !hasRealDate, rawPct };
  });

  const spread = spreadPositions(dated.map((d: any) => d.rawPct));

  const tasks: TimelineTask[] = dated.map((d: any, i: number) => ({
    id: d.t.id,
    title: d.t.title,
    completed: !!d.t.completed,
    isPriority: !!d.t.isPriority,
    weight: Number(d.t.weight) || 1,
    dueDate: d.dueDate,
    estimated: d.estimated,
    leftPct: spread[i],
  }));

  const progressPct = getWeightedProgress(rawTasks);

  return { range, tasks, progressPct };
}
