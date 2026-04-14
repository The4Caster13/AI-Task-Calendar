export interface Task {
  id: string;
  title: string;
  weight: number; // 1 to 10
  completed: boolean;
  isPriority?: boolean;
  completedAt?: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  status: 'active' | 'other' | 'completed';
}

export interface AppState {
  goals: Goal[];
  activeGoalId: string | null;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
}
