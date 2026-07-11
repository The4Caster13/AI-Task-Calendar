import React from 'react';
import { Clock, User, Settings2, Gauge, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COMPANION_PACE_PRESETS, getCompanionPace, type CompanionPaceId } from '@/lib/companionPace';
import { COLOR_THEME_LIST, DEFAULT_COLOR_THEME, type ColorTheme, type ColorThemeId } from '@/lib/colorThemes';

export default function Settings({ state, setState }: { state: any, setState: any }) {
  // Use existing settings or default to 9-to-6
  const settings = state.settings || { dayStart: 9, dayEnd: 18 };
  const companionPace = getCompanionPace(settings);
  const activeColorTheme: ColorThemeId = settings.colorTheme || DEFAULT_COLOR_THEME;

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

  const updateColorTheme = (themeId: ColorThemeId) => {
    setState((prev: any) => ({
      ...prev,
      settings: {
        ...(prev.settings || { dayStart: 9, dayEnd: 18 }),
        colorTheme: themeId,
      }
    }));
  };

  const updateCompanionPace = (pace: CompanionPaceId) => {
    setState((prev: any) => ({
      ...prev,
      settings: {
        ...(prev.settings || { dayStart: 9, dayEnd: 18 }),
        companionPace: pace,
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
        <div className="p-2 bg-clay/15 rounded-lg">
          <Settings2 className="w-6 h-6 text-clay" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground text-sm">Manage your workspace preferences and schedule.</p>
        </div>
      </div>

      {/* Work Schedule Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-2">
          <Clock className="w-4 h-4 text-clay" />
          <h3 className="text-sm font-bold text-foreground">Work Schedule</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Adjust your active hours. This affects the "Day Progress" bars and pacing calculations 
            throughout the app to match when you actually start and end your day.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Day Start</label>
              <select 
                value={settings.dayStart}
                onChange={(e) => updateWorkHours('dayStart', e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-clay"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Day End</label>
              <select 
                value={settings.dayEnd}
                onChange={(e) => updateWorkHours('dayEnd', e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-clay"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Companion Pace Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-clay" />
          <h3 className="text-sm font-bold text-foreground">Companion Pace</h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            How much work you want to do in a given period. This decides when the dashboard's
            companions consider you've done "enough" — a lighter pace celebrates sooner, a more
            intense pace expects more before it does.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(COMPANION_PACE_PRESETS) as CompanionPaceId[]).map((id) => {
              const preset = COMPANION_PACE_PRESETS[id];
              const active = companionPace.id === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateCompanionPace(id)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all",
                    active ? "border-clay bg-clay/10 ring-1 ring-clay" : "border-border hover:border-clay/40"
                  )}
                >
                  <p className={cn("text-sm font-bold", active ? "text-espresso" : "text-foreground")}>{preset.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{preset.description}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-3">{preset.streakGoalDays}d streak · {preset.weeklyOutputGoalPct}% weekly</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-2">
          <Palette className="w-4 h-4 text-clay" />
          <h3 className="text-sm font-bold text-foreground">Appearance</h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Pick the color scheme for your whole workspace. Each preview below is a live mockup
            of that scheme — pick the one you like and it applies everywhere immediately.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLOR_THEME_LIST.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                active={activeColorTheme === theme.id}
                onSelect={() => updateColorTheme(theme.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Account Profile Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Personal Account</h4>
            <p className="text-xs text-muted-foreground">Settings are synced to your cloud profile.</p>
          </div>
        </div>
        
        {/* FIXED: Replaced <Badge> with a styled <span> */}
        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-blue/10 text-slate-blue border border-slate-blue/25 uppercase tracking-wider">
          Verified
        </span>
      </div>

      <div className="flex justify-end pt-4">
        <p className="text-[10px] text-muted-foreground font-bold uppercase italic">Changes are saved automatically to Supabase</p>
      </div>
    </div>
  );
}

// Live mockup of a theme, rendered with that theme's own hex values (not the
// app's active CSS variables) so every option previews correctly at once,
// regardless of which scheme is currently applied.
const MOCK_BAR_HEIGHTS = [30, 45, 38, 60, 50, 70, 55];

function ThemePreviewCard({ theme, active, onSelect }: { theme: ColorTheme; active: boolean; onSelect: () => void }) {
  const v = theme.vars;
  const chartColors = [v.chart1, v.chart2, v.chart3, v.chart4, v.chart5];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left rounded-2xl border-2 p-3 transition-all relative"
      style={{ borderColor: active ? v.ring : v.border, background: v.background }}
    >
      {active && (
        <span
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: v.primary, color: v.primaryForeground }}
        >
          <Check size={12} strokeWidth={3.5} />
        </span>
      )}

      {/* Mini app mockup */}
      <div className="rounded-xl p-3 space-y-2.5" style={{ background: v.card, border: `1px solid ${v.border}` }}>
        <div className="flex items-center justify-between">
          <div className="h-2 w-12 rounded-full" style={{ background: v.mutedForeground, opacity: 0.5 }} />
          <div className="h-4 w-4 rounded-full" style={{ background: v.primary }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[v.primary, v.accent].map((dot, i) => (
            <div key={i} className="rounded-lg p-2 space-y-1.5" style={{ background: v.muted }}>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                <div className="h-1.5 w-8 rounded-full" style={{ background: v.mutedForeground, opacity: 0.4 }} />
              </div>
              <div className="h-1.5 w-full rounded-full" style={{ background: v.mutedForeground, opacity: 0.25 }} />
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 h-10 px-0.5">
          {MOCK_BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: `${h}%`, background: chartColors[i % chartColors.length] }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: v.foreground }}>{theme.label}</p>
          <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: v.mutedForeground }}>{theme.description}</p>
        </div>
        <div className="flex shrink-0 -space-x-1">
          {theme.swatches.map((swatch, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: swatch, border: `1px solid ${v.card}` }} />
          ))}
        </div>
      </div>
    </button>
  );
}