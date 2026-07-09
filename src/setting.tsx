import React from 'react';
import { Clock, User, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Settings({ state, setState }: { state: any, setState: any }) {
  // Use existing settings or default to 9-to-6
  const settings = state.settings || { dayStart: 9, dayEnd: 18 };

  const updateWorkHours = (field: 'dayStart' | 'dayEnd', value: string) => {
    const numValue = parseInt(value);
    setState((prev: any) => ({
      ...prev,
      settings: {
        ...(prev.settings || { dayStart: 9, dayEnd: 18 }),
        [field]: numValue
      }
    }));
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Settings2 className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500 text-sm">Manage your workspace preferences and schedule.</p>
        </div>
      </div>

      {/* Work Schedule Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Work Schedule</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Adjust your active hours. This affects the "Day Progress" bars and pacing calculations 
            throughout the app to match when you actually start and end your day.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day Start</label>
              <select 
                value={settings.dayStart}
                onChange={(e) => updateWorkHours('dayStart', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day End</label>
              <select 
                value={settings.dayEnd}
                onChange={(e) => updateWorkHours('dayEnd', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Account Profile Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Personal Account</h4>
            <p className="text-xs text-slate-400">Settings are synced to your cloud profile.</p>
          </div>
        </div>
        
        {/* FIXED: Replaced <Badge> with a styled <span> */}
        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
          Verified
        </span>
      </div>

      <div className="flex justify-end pt-4">
        <p className="text-[10px] text-slate-400 font-bold uppercase italic">Changes are saved automatically to Supabase</p>
      </div>
    </div>
  );
}