import React, { useMemo } from 'react';
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

interface ProjectViewProps {
  state: any;
  projectId: string;
}

const ProjectView = ({ state, projectId }: ProjectViewProps) => {
  // Find the specific project from the global state
  const activeProject = useMemo(() => {
    return state.goals.find((g: any) => g.id === projectId);
  }, [state.goals, projectId]);

  // If project doesn't exist, show error
  if (!activeProject) return <div className="p-20 text-center text-slate-400">Project not found</div>;

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
  const urgencyColor = hasHighPriority ? "bg-red-500" : "bg-indigo-600";

  return (
    <div className="flex-1 w-full p-8 space-y-8 pb-32">
      
      {/* Top Row Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Unified Pacing Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">Project Pacing</h3>
          <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
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
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span>Progress: {taskProgress.toFixed(0)}%</span>
            <span>Work Day: {timeProgress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Task Velocity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">Task Ratio</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-800">{doneCount}/{totalCount}</span>
            <span className="text-slate-400 font-bold pb-1 text-xs uppercase tracking-tighter">Done</span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-5 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${taskProgress}%` }} />
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Health Check</h3>
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-sm font-bold text-slate-800">Healthy & Active</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Updated recently</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sprint Board (Kanban Waterfall) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-400" /> Sprint Board
            </h3>
            <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal size={20}/></button>
          </div>
          
          <div className="flex items-start justify-between gap-4 min-h-[400px]">
            {/* To-Do Column */}
            <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col gap-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Backlog</h4>
              {activeProject.tasks.filter((t: any) => !t.completed && !t.isPriority).map((t: any) => (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-xs font-bold text-slate-600">
                  {t.title}
                </div>
              ))}
            </div>

            <ArrowRight className="text-slate-200 mt-12" size={18} />

            {/* Doing Column */}
            <div className="flex-1 bg-indigo-50/30 rounded-2xl border border-indigo-100 p-4 flex flex-col gap-3">
              <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 px-1">Active</h4>
              {activeProject.tasks.filter((t: any) => !t.completed && t.isPriority).map((t: any) => (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-500 text-xs font-black text-slate-800">
                  {t.title}
                </div>
              ))}
            </div>

            <ArrowRight className="text-slate-200 mt-12" size={18} />

            {/* Done Column */}
            <div className="flex-1 bg-emerald-50/30 rounded-2xl border border-emerald-100 p-4 flex flex-col gap-3">
              <h4 className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 px-1">Finished</h4>
              {activeProject.tasks.filter((t: any) => t.completed).map((t: any) => (
                <div key={t.id} className="bg-white/60 p-4 rounded-xl border border-emerald-50 text-xs text-slate-400 line-through font-medium">
                  {t.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Sidebar (Milestones & Resources) */}
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Milestones</h3>
                    <Flag size={18} className="text-indigo-500" />
                </div>
                
                <div className="space-y-6">
                    <MilestoneItem title="Launch Beta" date="In 4 days" status="current" color="bg-indigo-500" />
                    <MilestoneItem title="Final Review" date="June 28" status="upcoming" color="bg-slate-200" />
                    <MilestoneItem title="Requirement Specs" date="Completed" status="done" color="bg-emerald-500" />
                </div>
            </div>

            <div className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-500/20 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-indigo-200 fill-indigo-200" />
                    <h4 className="font-bold">Project Goal</h4>
                </div>
                <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                    {activeProject.description || "No description set for this project yet."}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for Milestones
const MilestoneItem = ({ title, date, status, color }: any) => (
  <div className="flex gap-4 items-start group">
    <div className="flex flex-col items-center">
      <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 transition-all ring-4 ring-white shadow-sm", color)} />
      <div className="w-px h-10 bg-slate-100 group-last:hidden" />
    </div>
    <div>
      <p className={cn("text-xs font-bold", status === 'done' ? 'text-slate-400' : 'text-slate-800')}>{title}</p>
      <p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{date}</p>
    </div>
  </div>
);

export default ProjectView;