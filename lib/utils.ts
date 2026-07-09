import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DueTone = "overdue" | "today" | "upcoming"

// Formats a task's dueDate timestamp into a short label ("Today", "Tomorrow",
// "Jul 15") plus a tone used to color-code overdue/today/upcoming tasks
// consistently across Daily Tasks, the Dashboard, and the Calendar.
export function formatDueDate(timestamp?: number): { label: string; tone: DueTone } | null {
  if (!timestamp) return null
  const due = new Date(timestamp)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return { label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }), tone: "overdue" }
  if (diffDays === 0) return { label: "Today", tone: "today" }
  if (diffDays === 1) return { label: "Tomorrow", tone: "upcoming" }
  return { label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }), tone: "upcoming" }
}
