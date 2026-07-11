import React, { useMemo, useState } from 'react';
import {
  DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  ArrowRight,
  SlidersHorizontal,
  Layers,
  Flag,
  Zap,
  MoreHorizontal,
  Plus,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type BoardColumnId = 'backlog' | 'active' | 'finished';

interface ProjectViewProps {
  state: any;
  setState: any;
  projectId: string;
}

const ProjectView = ({ state, setState, projectId }: ProjectViewProps) => {
  // Find the specific project from the global state
  const activeProject = useMemo(() => {
    return state.goals.find((g: any) => g.id === projectId);
  }, [state.goals, projectId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const moveTask = (taskId: string, column: BoardColumnId) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id !== projectId ? g : {
          ...g,
          tasks: g.tasks.map((t: any) => {
            if (t.id !== taskId) return t;
            if (column === 'finished') return { ...t, completed: true, isPriority: false, completedAt: t.completedAt ?? Date.now() };
            if (column === 'active') return { ...t, completed: false, isPriority: true, completedAt: undefined };
            return { ...t, completed: false, isPriority: false, completedAt: undefined };
          }),
        }
      )),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    moveTask(String(active.id), over.id as BoardColumnId);
  };

  // Edit Project dialog — details, due date, and goal/description
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  const handleEditOpenChange = (open: boolean) => {
    setIsEditOpen(open);
    if (open && activeProject) {
      setEditTitle(activeProject.title);
      setEditDescription(activeProject.description || '');
      setEditDeadline(activeProject.deadline ? new Date(activeProject.deadline).toISOString().slice(0, 10) : '');
    }
  };

  const handleSaveEdit = () => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id === projectId
          ? {
              ...g,
              title: editTitle.trim() || g.title,
              description: editDescription,
              deadline: editDeadline ? new Date(editDeadline).getTime() : undefined,
              updatedAt: Date.now(),
            }
          : g
      )),
    }));
    setIsEditOpen(false);
  };

  // Milestones — editable list of {id, title, dueDate?, completed}
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const updateMilestone = (milestoneId: string, patch: any) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id !== projectId ? g : {
          ...g,
          milestones: (g.milestones ?? []).map((m: any) => (m.id === milestoneId ? { ...m, ...patch } : m)),
        }
      )),
    }));
  };

  const toggleMilestone = (milestoneId: string) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id !== projectId ? g : {
          ...g,
          milestones: (g.milestones ?? []).map((m: any) => (m.id === milestoneId ? { ...m, completed: !m.completed } : m)),
        }
      )),
    }));
  };

  const removeMilestone = (milestoneId: string) => {
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id !== projectId ? g : { ...g, milestones: (g.milestones ?? []).filter((m: any) => m.id !== milestoneId) }
      )),
    }));
  };

  const addMilestone = () => {
    const title = newMilestoneTitle.trim();
    if (!title) return;
    const milestone = { id: crypto.randomUUID(), title, dueDate: undefined, completed: false };
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id !== projectId ? g : { ...g, milestones: [...(g.milestones ?? []), milestone] }
      )),
    }));
    setNewMilestoneTitle('');
  };

  // Task detail — click into a Sprint Board card to edit its title, due
  // date, priority, and notes.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskEditTitle, setTaskEditTitle] = useState('');
  const [taskEditNotes, setTaskEditNotes] = useState('');
  const [taskEditDueDate, setTaskEditDueDate] = useState('');
  const [taskEditPriority, setTaskEditPriority] = useState(false);

  const openTaskDetail = (task: any) => {
    setSelectedTaskId(task.id);
    setTaskEditTitle(task.title);
    setTaskEditNotes(task.notes || '');
    setTaskEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setTaskEditPriority(!!task.isPriority);
  };

  const handleSaveTaskDetail = () => {
    if (!selectedTaskId) return;
    setState((prev: any) => ({
      ...prev,
      goals: prev.goals.map((g: any) => (
        g.id !== projectId ? g : {
          ...g,
          tasks: g.tasks.map((t: any) => (
            t.id !== selectedTaskId ? t : {
              ...t,
              title: taskEditTitle.trim() || t.title,
              notes: taskEditNotes,
              dueDate: taskEditDueDate ? new Date(taskEditDueDate).getTime() : undefined,
              isPriority: taskEditPriority,
            }
          )),
        }
      )),
    }));
    setSelectedTaskId(null);
  };

  // If project doesn't exist, show error
  if (!activeProject) return <div className="p-20 text-center text-muted-foreground">Project not found</div>;

  // Logic for the Unified Pacing Bar — paced against the project's own
  // due date (creation → deadline elapsed) instead of today's work hours,
  // which said nothing about the project's actual timeline.
  const hasDeadline = typeof activeProject.deadline === 'number';
  const timeProgress = useMemo(() => {
    if (!hasDeadline) return null;
    const start = activeProject.createdAt ?? activeProject.deadline;
    const span = Math.max(activeProject.deadline - start, 1);
    return Math.min(Math.max(((Date.now() - start) / span) * 100, 0), 100);
  }, [activeProject, hasDeadline]);

  const doneCount = activeProject.tasks.filter((t: any) => t.completed).length;
  const totalCount = activeProject.tasks.length;
  const taskProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  
  // Urgency Color Logic
  const hasHighPriority = activeProject.tasks.some((t: any) => !t.completed && (t.priority === 'high' || t.isPriority));
  const urgencyColor = hasHighPriority ? "bg-destructive" : "bg-clay";

  return (
    <div className="flex-1 w-full p-8 space-y-8 pb-32">
      
      {/* Top Row Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Unified Pacing Card */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-4">Project Pacing</h3>
          <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden mb-4 shadow-inner">
             {/* Due Date Ghost Bar — only shown once a deadline is set */}
             {timeProgress !== null && (
               <div
                 className={cn("absolute h-full opacity-20 transition-all duration-1000", urgencyColor)}
                 style={{ width: `${timeProgress}%` }}
               />
             )}
             {/* Task Solid Bar */}
             <div
               className={cn("absolute h-full transition-all duration-700 shadow-sm", urgencyColor)}
               style={{ width: `${taskProgress}%` }}
             />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Progress: {taskProgress.toFixed(0)}%</span>
            {timeProgress !== null ? (
              <span>Time to Due Date: {timeProgress.toFixed(1)}%</span>
            ) : (
              <span className="italic normal-case tracking-normal text-muted-foreground/70">No due date set</span>
            )}
          </div>
        </div>

        {/* Task Velocity */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-4">Task Ratio</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-foreground">{doneCount}/{totalCount}</span>
            <span className="text-muted-foreground font-bold pb-1 text-xs uppercase tracking-tighter">Done</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full mt-5 overflow-hidden">
            <div className="h-full bg-slate-blue transition-all duration-1000" style={{ width: `${taskProgress}%` }} />
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
          <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3">Health Check</h3>
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-slate-blue animate-pulse" />
             <p className="text-sm font-bold text-foreground">Healthy & Active</p>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase">Updated recently</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sprint Board (Kanban Waterfall) */}
        <div className="lg:col-span-2 min-w-0 overflow-hidden bg-card p-8 rounded-[32px] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-muted-foreground" /> Sprint Board
            </h3>
            <button className="text-muted-foreground/50 hover:text-muted-foreground"><MoreHorizontal size={20}/></button>
          </div>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex items-start justify-between gap-4 min-h-[400px]">
              {/* To-Do Column */}
              <BoardColumn id="backlog" className="flex-1 min-w-0 bg-muted/40 rounded-2xl border border-border p-4 flex flex-col gap-3">
                <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3 pt-1 px-1">Backlog</h4>
                {activeProject.tasks.filter((t: any) => !t.completed && !t.isPriority).map((t: any) => (
                  <DraggableTask key={t.id} id={t.id} onClick={() => openTaskDetail(t)} className="bg-card p-4 rounded-xl shadow-sm border border-border text-xs font-bold text-foreground/80">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">{t.title}</span>
                      <PriorityBadge isPriority={!!t.isPriority} />
                    </div>
                  </DraggableTask>
                ))}
              </BoardColumn>

              <FlowConnector />

              {/* Doing Column */}
              <BoardColumn id="active" className="flex-1 min-w-0 bg-clay/10 rounded-2xl border border-clay/25 p-4 flex flex-col gap-3">
                <h4 className="text-[9px] font-black text-clay uppercase tracking-widest mb-3 pt-1 px-1">Active</h4>
                {activeProject.tasks.filter((t: any) => !t.completed && t.isPriority).map((t: any) => (
                  <DraggableTask key={t.id} id={t.id} onClick={() => openTaskDetail(t)} className="bg-card p-4 rounded-xl shadow-sm border-l-4 border-clay text-xs font-black text-foreground">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">{t.title}</span>
                      <PriorityBadge isPriority={!!t.isPriority} />
                    </div>
                  </DraggableTask>
                ))}
              </BoardColumn>

              <FlowConnector />

              {/* Done Column */}
              <BoardColumn id="finished" className="flex-1 min-w-0 bg-slate-blue/10 rounded-2xl border border-slate-blue/25 p-4 flex flex-col gap-3">
                <h4 className="text-[9px] font-black text-slate-blue uppercase tracking-widest mb-3 pt-1 px-1">Finished</h4>
                {activeProject.tasks.filter((t: any) => t.completed).map((t: any) => (
                  <DraggableTask key={t.id} id={t.id} onClick={() => openTaskDetail(t)} className="bg-card/60 p-4 rounded-xl border border-slate-blue/20 text-xs text-muted-foreground line-through font-medium">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">{t.title}</span>
                      <PriorityBadge isPriority={!!t.isPriority} />
                    </div>
                  </DraggableTask>
                ))}
              </BoardColumn>
            </div>
          </DndContext>
        </div>

        {/* Project Sidebar (Milestones & Resources) */}
        <div className="space-y-6">
            <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Milestones</h3>
                    <Flag size={18} className="text-clay" />
                </div>
                
                <div className="space-y-3">
                    {(activeProject.milestones ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No milestones yet — add one below.</p>
                    )}
                    {(activeProject.milestones ?? []).map((m: any) => (
                      <MilestoneItem
                        key={m.id}
                        milestone={m}
                        onToggle={() => toggleMilestone(m.id)}
                        onChangeTitle={(title: string) => updateMilestone(m.id, { title })}
                        onChangeDate={(dueDate?: number) => updateMilestone(m.id, { dueDate })}
                        onRemove={() => removeMilestone(m.id)}
                      />
                    ))}
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
                        placeholder="Add a milestone..."
                        className="h-8 text-xs"
                      />
                      <button
                        onClick={addMilestone}
                        aria-label="Add milestone"
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                </div>
            </div>

            <div className="bg-espresso p-6 rounded-[32px] shadow-lg shadow-espresso/20 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-blush fill-blush" />
                    <h4 className="font-bold">Project Goal</h4>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-medium">
                    {activeProject.description || "No description set for this project yet."}
                </p>
            </div>

            <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all text-xs font-black uppercase tracking-widest">
                  <SlidersHorizontal size={14} /> Edit Project
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Title</label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Goal</label>
                    <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What's this project about?" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Due Date</label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveEdit} className="w-full bg-primary text-primary-foreground">Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Task Detail — click a Sprint Board card to edit it */}
      <Dialog open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Task Details</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Title</label>
              <Input value={taskEditTitle} onChange={(e) => setTaskEditTitle(e.target.value)} placeholder="Task title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Due Date</label>
                <input
                  type="date"
                  value={taskEditDueDate}
                  onChange={(e) => setTaskEditDueDate(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Priority</label>
                <button
                  type="button"
                  onClick={() => setTaskEditPriority((p) => !p)}
                  className={cn(
                    "w-full h-10 rounded-lg border text-sm font-bold transition-colors",
                    taskEditPriority ? "bg-clay/15 border-clay text-clay" : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {taskEditPriority ? "High Priority" : "Normal"}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Notes</label>
              <textarea
                value={taskEditNotes}
                onChange={(e) => setTaskEditNotes(e.target.value)}
                placeholder="Add notes about this task..."
                rows={4}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTaskDetail} className="w-full bg-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Droppable Sprint Board column
const BoardColumn = ({ id, className, children }: { id: BoardColumnId; className: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "ring-2 ring-clay/40")}>
      {children}
    </div>
  );
};

// Draggable Sprint Board task card
const DraggableTask = ({ id, className, children, onClick }: { id: string; className: string; children: React.ReactNode; onClick?: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(className, isDragging ? "opacity-50 shadow-lg cursor-grabbing" : "cursor-grab")}
    >
      {children}
    </div>
  );
};

// Priority indicator for Sprint Board cards
const PriorityBadge = ({ isPriority }: { isPriority: boolean }) => (
  <span
    className={cn(
      "shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide",
      isPriority ? "bg-clay/15 text-clay" : "bg-muted text-muted-foreground"
    )}
  >
    {isPriority ? "High" : "Normal"}
  </span>
);

// Flow connector between Sprint Board columns — a line + arrowhead instead
// of a lone floating icon, to read as one continuous workflow.
const FlowConnector = () => (
  <div className="hidden sm:flex items-center shrink-0 w-6 mt-12">
    <div className="flex-1 h-px bg-gradient-to-r from-border to-primary/40" />
    <ArrowRight className="text-primary/50 shrink-0 -ml-0.5" size={14} />
  </div>
);

// Sub-component for Milestones
const MilestoneItem = ({ milestone, onToggle, onChangeTitle, onChangeDate, onRemove }: {
  milestone: any;
  onToggle: () => void;
  onChangeTitle: (title: string) => void;
  onChangeDate: (dueDate?: number) => void;
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-3 group">
    <button
      onClick={onToggle}
      aria-label={milestone.completed ? 'Mark milestone incomplete' : 'Mark milestone complete'}
      className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
        milestone.completed ? "bg-slate-blue border-slate-blue" : "border-border hover:border-slate-blue/60"
      )}
    >
      {milestone.completed && <Check size={9} className="text-white" strokeWidth={4} />}
    </button>
    <input
      value={milestone.title}
      onChange={(e) => onChangeTitle(e.target.value)}
      placeholder="Milestone"
      className={cn(
        "flex-1 min-w-0 bg-transparent text-xs font-bold outline-none border-b border-transparent focus:border-border py-0.5",
        milestone.completed ? "text-muted-foreground line-through" : "text-foreground"
      )}
    />
    <input
      type="date"
      value={milestone.dueDate ? new Date(milestone.dueDate).toISOString().slice(0, 10) : ''}
      onChange={(e) => onChangeDate(e.target.value ? new Date(e.target.value).getTime() : undefined)}
      className="text-[10px] font-bold text-muted-foreground uppercase bg-transparent outline-none w-[6.5rem] shrink-0"
    />
    <button
      onClick={onRemove}
      aria-label="Remove milestone"
      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-destructive transition-opacity"
    >
      <X size={12} />
    </button>
  </div>
);

export default ProjectView;