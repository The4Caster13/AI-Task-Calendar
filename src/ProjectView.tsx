import React, { useMemo } from 'react';
import {
  DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Layers,
  Flag,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // If project doesn't exist, show error
  if (!activeProject) return <div className="p-20 text-center text-muted-foreground">Project not found</div>;

  // Logic for the Unified Pacing Bar
  // This uses the settings from your state (defaulting to 9-6)
  const settings = state.settings || { dayStart: 9, dayEnd: 18 };
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  
  const timeProgress = useMemo(() => {
    if (currentHour < settings.dayStart) return 0;
    if (currentHour > settings.dayEnd) return 100;
    return ((currentHour - settings.dayStart) / (settings.dayEnd - settings.dayStart)) * 100;
  }, [currentHour, settings]);

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
             {/* Day Ghost Bar */}
             <div 
               className={cn("absolute h-full opacity-20 transition-all duration-1000", urgencyColor)} 
               style={{ width: `${timeProgress}%` }}
             />
             {/* Task Solid Bar */}
             <div 
               className={cn("absolute h-full transition-all duration-700 shadow-sm", urgencyColor)} 
               style={{ width: `${taskProgress}%` }}
             />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Progress: {taskProgress.toFixed(0)}%</span>
            <span>Work Day: {timeProgress.toFixed(1)}%</span>
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
        <div className="lg:col-span-2 bg-card p-8 rounded-[32px] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-muted-foreground" /> Sprint Board
            </h3>
            <button className="text-muted-foreground/50 hover:text-muted-foreground"><MoreHorizontal size={20}/></button>
          </div>
          
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex items-start justify-between gap-4 min-h-[400px]">
              {/* To-Do Column */}
              <BoardColumn id="backlog" className="flex-1 bg-muted/40 rounded-2xl border border-border p-4 flex flex-col gap-3">
                <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Backlog</h4>
                {activeProject.tasks.filter((t: any) => !t.completed && !t.isPriority).map((t: any) => (
                  <DraggableTask key={t.id} id={t.id} className="bg-card p-4 rounded-xl shadow-sm border border-border text-xs font-bold text-foreground/80">
                    {t.title}
                  </DraggableTask>
                ))}
              </BoardColumn>

              <ArrowRight className="text-muted-foreground/30 mt-12" size={18} />

              {/* Doing Column */}
              <BoardColumn id="active" className="flex-1 bg-clay/10 rounded-2xl border border-clay/25 p-4 flex flex-col gap-3">
                <h4 className="text-[9px] font-black text-clay uppercase tracking-widest mb-2 px-1">Active</h4>
                {activeProject.tasks.filter((t: any) => !t.completed && t.isPriority).map((t: any) => (
                  <DraggableTask key={t.id} id={t.id} className="bg-card p-4 rounded-xl shadow-sm border-l-4 border-clay text-xs font-black text-foreground">
                    {t.title}
                  </DraggableTask>
                ))}
              </BoardColumn>

              <ArrowRight className="text-muted-foreground/30 mt-12" size={18} />

              {/* Done Column */}
              <BoardColumn id="finished" className="flex-1 bg-slate-blue/10 rounded-2xl border border-slate-blue/25 p-4 flex flex-col gap-3">
                <h4 className="text-[9px] font-black text-slate-blue uppercase tracking-widest mb-2 px-1">Finished</h4>
                {activeProject.tasks.filter((t: any) => t.completed).map((t: any) => (
                  <DraggableTask key={t.id} id={t.id} className="bg-card/60 p-4 rounded-xl border border-slate-blue/20 text-xs text-muted-foreground line-through font-medium">
                    {t.title}
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
                
                <div className="space-y-6">
                    <MilestoneItem title="Launch Beta" date="In 4 days" status="current" color="bg-clay" />
                    <MilestoneItem title="Final Review" date="June 28" status="upcoming" color="bg-muted-foreground/30" />
                    <MilestoneItem title="Requirement Specs" date="Completed" status="done" color="bg-slate-blue" />
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
        </div>
      </div>
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
const DraggableTask = ({ id, className, children }: { id: string; className: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(className, isDragging ? "opacity-50 shadow-lg cursor-grabbing" : "cursor-grab")}
    >
      {children}
    </div>
  );
};

// Sub-component for Milestones
const MilestoneItem = ({ title, date, status, color }: any) => (
  <div className="flex gap-4 items-start group">
    <div className="flex flex-col items-center">
      <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 transition-all ring-4 ring-card shadow-sm", color)} />
      <div className="w-px h-10 bg-border group-last:hidden" />
    </div>
    <div>
      <p className={cn("text-xs font-bold", status === 'done' ? 'text-muted-foreground' : 'text-foreground')}>{title}</p>
      <p className="text-[9px] font-black text-muted-foreground uppercase mt-0.5">{date}</p>
    </div>
  </div>
);

export default ProjectView;