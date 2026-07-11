// Shared easing/variants so motion feels consistent across the app instead
// of every component picking its own ad-hoc curve.
export const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const;

export const TRANSITION_VIEW = { duration: 0.35, ease: EASE_SMOOTH };

export const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export const FADE_UP_ITEM = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_SMOOTH } },
};
