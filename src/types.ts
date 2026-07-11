export interface Task {
  id: string;
  title: string;
  weight: number; // 1 to 10
  completed: boolean;
  isPriority?: boolean;
  completedAt?: number;
}

export interface Goal {
  color: any;
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
  tasks?: Task[]; // tasks not assigned to any project
  activeGoalId: string | null;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
}
