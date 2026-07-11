// How much work someone wants to do in a given period — controls the
// thresholds at which the dashboard's mushroom companions consider a goal
// "reached" (Campfire celebration, Cliffhanger flag-bearer vs free-fall).
export type CompanionPaceId = "light" | "balanced" | "intense";

export const DEFAULT_COMPANION_PACE: CompanionPaceId = "balanced";

export const COMPANION_PACE_PRESETS: Record<CompanionPaceId, {
  label: string;
  description: string;
  streakGoalDays: number;
  weeklyOutputGoalPct: number;
}> = {
  light: { label: "Light", description: "Easing in", streakGoalDays: 7, weeklyOutputGoalPct: 25 },
  balanced: { label: "Balanced", description: "Steady pace", streakGoalDays: 30, weeklyOutputGoalPct: 50 },
  intense: { label: "Intense", description: "Push hard", streakGoalDays: 60, weeklyOutputGoalPct: 80 },
};

export function getCompanionPace(settings: any) {
  const id: CompanionPaceId = settings?.companionPace in COMPANION_PACE_PRESETS ? settings.companionPace : DEFAULT_COMPANION_PACE;
  return { id, ...COMPANION_PACE_PRESETS[id] };
}
