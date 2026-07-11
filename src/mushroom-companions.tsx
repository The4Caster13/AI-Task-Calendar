import { useEffect, useRef, useState, type CSSProperties } from "react";

// ─── Mushroom Companions ───────────────────────────────────────────────────
// Recreated from the design handoff's mushroom-companions.html reference.
// CSS keyframes/timings/easing live in mushroom-companions.css (ported 1:1,
// prefixed mc-). The SVG character parts live in <MushroomSprite/> (mounted
// once in App.tsx) and are referenced here via <use href="#mcX"/>.

function speedStyle(speed: number): CSSProperties {
  return { "--speed": speed } as CSSProperties;
}

// ─── 1 · Campfire (Day Streak card, bottom-right) ──────────────────────────
export function CampfireCompanion({ streakDays, streakGoalDays = 30, zenMode, speed = 1 }: { streakDays: number; streakGoalDays?: number; zenMode?: boolean; speed?: number }) {
  const celebration = streakDays >= streakGoalDays;
  const style = speedStyle(speed);

  if (zenMode) {
    return (
      <div className="mc-root absolute right-3 bottom-2" style={style}>
        <span className="mc-zzz">z z Z</span>
      </div>
    );
  }

  if (celebration) {
    return (
      <div className="mc-root mc-campfire-b" style={style}>
        <div className="mc-bobber" style={{ left: 0 }}>
          <svg width="40" height="56" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapRed" /></svg>
        </div>
        <div className="mc-fire mc-flickering" style={{ left: 58 }}>
          <div className="mc-log1" /><div className="mc-log2" />
          <svg width="26" height="30" viewBox="0 0 26 30"><use href="#mcFlame" /></svg>
        </div>
        <div className="mc-bobber" style={{ left: 110 }}>
          <div className="mc-mirrored">
            <svg width="40" height="56" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapBrown" /></svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-root mc-campfire-a" style={style}>
      <div className="mc-roaster"><div><svg width="40" height="56" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapRed" /></svg></div></div>
      <div className="mc-stick"><div className="mc-stick-line" /><div className="mc-mallow" /></div>
      <div className="mc-fire" style={{ right: 6 }}>
        <div className="mc-log1" /><div className="mc-log2" />
        <svg width="26" height="30" viewBox="0 0 26 30"><use href="#mcFlame" /></svg>
      </div>
    </div>
  );
}

// ─── 2 · Cliff-hanger (Weekly Output card, top-right edge) ─────────────────
// Host card needs overflow: visible + ~56px clearance above (top: -53px).
export function CliffhangerCompanion({ isHighOutput, zenMode, speed = 1 }: { isHighOutput: boolean; zenMode?: boolean; speed?: number }) {
  const style = speedStyle(speed);

  if (zenMode) {
    return (
      <div className="mc-root absolute -top-2.5 right-4" style={style}>
        <span className="mc-zzz">z Z</span>
      </div>
    );
  }

  if (isHighOutput) {
    return (
      <div className="mc-root mc-flagbearer" style={style}>
        <div style={{ position: "relative" }}>
          <div className="mc-puffer"><svg width="40" height="56" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapYellow" /></svg></div>
          <div className="mc-flagpole" />
          <svg className="mc-flag" width="20" height="13" viewBox="0 0 20 13"><path d="M0 0.5 L19 5.8 L0 11.5 Z" fill="#c1442e" /></svg>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-root mc-freefall" style={style}>
      <div className="mc-faller"><svg width="34" height="48" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapBlue" /></svg></div>
      <div className="mc-umbrella">
        <div className="mc-umb-pole" />
        <svg width="36" height="20" viewBox="0 0 44 22" style={{ position: "absolute", left: 0, top: 0 }}><use href="#mcUmbCanopy" /></svg>
      </div>
      <div className="mc-wind" style={{ left: 6, top: 38, width: 26, animationDuration: `calc(1.6s / ${speed})` }} />
      <div className="mc-wind" style={{ left: 0, top: 86, width: 34, background: "#cdb996", animationDuration: `calc(2s / ${speed})`, animationDelay: `calc(.6s / ${speed})` }} />
      <div className="mc-wind" style={{ left: 12, top: 132, width: 20, animationDelay: `calc(1.1s / ${speed})` }} />
    </div>
  );
}

// ─── 3 · Builder (Active Projects card, patrols the top border) ───────────
// Host card needs overflow: visible + clearance above, same as the cliff-hanger.
type BuilderPhase = "walkL" | "read" | "hammer" | "walkR";
const WALK_MS = 3700, READ_MS = 2600, HAMMER_MS = 2400;
const BUILDER_MARGIN = 8;

export function BuilderCompanion({ zenMode, speed = 1 }: { zenMode?: boolean; speed?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<BuilderPhase>("walkL");

  useEffect(() => {
    if (zenMode) return;
    let cancelled = false;
    let xRight = 200;

    const measure = () => {
      const w = containerRef.current?.clientWidth ?? 200;
      xRight = Math.max(w - 48, BUILDER_MARGIN);
    };
    measure();
    window.addEventListener("resize", measure);

    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms / speed));
    const setX = (x: number, animated: boolean) => {
      const el = builderRef.current;
      if (!el) return;
      el.style.transition = animated ? `transform ${WALK_MS / 1000 / speed}s linear` : "none";
      el.style.transform = `translateX(${x}px)`;
    };

    (async () => {
      setX(xRight, false);
      while (!cancelled) {
        setPhase("walkL"); setX(BUILDER_MARGIN, true); await wait(WALK_MS);
        if (cancelled) break;
        setPhase("read"); await wait(READ_MS);
        if (cancelled) break;
        setPhase("hammer"); await wait(HAMMER_MS);
        if (cancelled) break;
        setPhase("walkR"); setX(xRight, true); await wait(WALK_MS);
      }
    })();

    return () => { cancelled = true; window.removeEventListener("resize", measure); };
  }, [zenMode, speed]);

  if (zenMode) {
    return (
      <div className="mc-root absolute top-2 left-3">
        <span className="mc-zzz">z z Z</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mc-root absolute inset-x-0 top-0 h-0 pointer-events-none select-none"
      style={speedStyle(speed)}
      data-mc-bphase={phase}
    >
      <div ref={builderRef} className="mc-builder">
        <div className="mc-builder-flip">
          <div className="mc-builder-idle">
            <svg width="40" height="56" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapHat" /></svg>
            <div className="mc-blueprint"><i /><i /><i /></div>
            <div className="mc-hammer"><div className="mc-hammer-handle" /><div className="mc-hammer-head" /></div>
            <svg className="mc-sparkle" width="13" height="13" viewBox="0 0 12 12"><use href="#mcSpark" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4 · Task Helper (task list rows) ──────────────────────────────────────
export function TaskPeekCharacter() {
  return (
    <div className="mc-peek-window">
      <div className="mc-peek-char">
        <svg width="27" height="26" viewBox="0 0 40 38">
          <use href="#mcBodyBlank" />
          <g className="mc-peek-eyes"><circle cx="15.5" cy="30" r="1.9" fill="#3a2d24" /><circle cx="24.5" cy="30" r="1.9" fill="#3a2d24" /></g>
          <use href="#mcCapBlue" />
        </svg>
      </div>
    </div>
  );
}

export function TaskJumperCharacter() {
  return (
    <div className="mc-jumper">
      <div className="mc-jumper-x">
        <div className="mc-jumper-y">
          <svg width="26" height="36" viewBox="0 0 40 56"><use href="#mcBody" /><use href="#mcCapBlue" /></svg>
        </div>
      </div>
    </div>
  );
}

export function TaskSmokePuffs() {
  return <div className="mc-smoke"><i /><i /><i /></div>;
}

export type TaskCompanionPhase = "idle" | "crouch" | "jump" | "squish" | "hop" | "smoke" | "done";

const JUMP_SEQUENCE: [TaskCompanionPhase, number][] = [
  ["crouch", 210], ["jump", 560], ["squish", 240], ["hop", 420], ["smoke", 470],
];

// Heavy-jump state machine. Fires the real completion callback at the "done"
// step instead of the reference demo's 4s auto-reset back to idle.
export function useTaskCompanionSequence(initialCompleted: boolean, onComplete: () => void, speed = 1) {
  const [phase, setPhase] = useState<TaskCompanionPhase>(initialCompleted ? "done" : "idle");
  const runningRef = useRef(false);

  const trigger = () => {
    if (runningRef.current || phase !== "idle") return;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("done");
      onComplete();
      return;
    }
    runningRef.current = true;
    (async () => {
      for (const [p, ms] of JUMP_SEQUENCE) {
        setPhase(p);
        await new Promise<void>((resolve) => setTimeout(resolve, ms / speed));
      }
      setPhase("done");
      onComplete();
      runningRef.current = false;
    })();
  };

  const reset = () => setPhase("idle");

  return { phase, trigger, reset };
}
