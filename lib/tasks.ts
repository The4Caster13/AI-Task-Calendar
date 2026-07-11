// Tasks can optionally belong to a project (goal). Unassigned tasks live in
// state.tasks (projectId is null); assigned tasks live nested in a goal's
// own tasks array. These helpers centralize toggle/delete/add/aggregate so
// every view (Daily, Dashboard, Calendar) treats "no project" the same way.

export function getAllTasks(state: any): any[] {
  const goalTasks = (state?.goals ?? []).flatMap((g: any) =>
    (g.tasks ?? []).map((t: any) => ({
      ...t, projectId: g.id, projectTitle: g.title, projectName: g.title, projectColor: g.color,
    }))
  );
  const unassigned = (state?.tasks ?? []).map((t: any) => ({
    ...t, projectId: null, projectTitle: "No Project", projectName: "No Project", projectColor: undefined,
  }));
  return [...goalTasks, ...unassigned];
}

export function toggleTaskInState(prev: any, taskId: string, projectId: string | null | undefined) {
  const flip = (t: any) => (
    t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t
  );
  if (!projectId) {
    return { ...prev, tasks: (prev.tasks ?? []).map(flip) };
  }
  return {
    ...prev,
    goals: prev.goals.map((g: any) => (g.id === projectId ? { ...g, tasks: g.tasks.map(flip) } : g)),
  };
}

export function deleteTaskFromState(prev: any, taskId: string, projectId: string | null | undefined) {
  if (!projectId) {
    return { ...prev, tasks: (prev.tasks ?? []).filter((t: any) => t.id !== taskId) };
  }
  return {
    ...prev,
    goals: prev.goals.map((g: any) => (g.id === projectId ? { ...g, tasks: g.tasks.filter((t: any) => t.id !== taskId) } : g)),
  };
}

export function addTaskToState(prev: any, projectId: string | null | undefined, task: any) {
  if (!projectId) {
    return { ...prev, tasks: [...(prev.tasks ?? []), task] };
  }
  return {
    ...prev,
    goals: prev.goals.map((g: any) => (
      g.id === projectId ? { ...g, tasks: [...(g.tasks ?? []), task], updatedAt: Date.now() } : g
    )),
  };
}
