// SVG sprite for the Mushroom Companions — mount once per page (in App.tsx).
// Characters are composed elsewhere via <use href="#id"/> references into
// this hidden <defs> block, ported 1:1 from the design handoff.
export default function MushroomSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <radialGradient id="mcGBody" cx="42%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#fdf7ea" /><stop offset="62%" stopColor="#f3e3c6" /><stop offset="100%" stopColor="#dfc49c" />
        </radialGradient>
        <linearGradient id="mcGCapRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d05a3c" /><stop offset="100%" stopColor="#96321f" /></linearGradient>
        <linearGradient id="mcGCapBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6f9cc0" /><stop offset="100%" stopColor="#3d6b8f" /></linearGradient>
        <linearGradient id="mcGCapYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e6c14e" /><stop offset="100%" stopColor="#b3892b" /></linearGradient>
        <linearGradient id="mcGCapBrown" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9a6a44" /><stop offset="100%" stopColor="#66422a" /></linearGradient>
        <linearGradient id="mcGHat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5cf49" /><stop offset="100%" stopColor="#cfa22a" /></linearGradient>
        <linearGradient id="mcGFlame" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2b13c" /><stop offset="100%" stopColor="#d9542b" /></linearGradient>

        <g id="mcBodyBlank">
          <ellipse cx="20" cy="52.5" rx="12" ry="2.6" fill="#3a2a18" opacity="0.1" />
          <path d="M20 14 C30 14 32 30 32 40 C32 49 27 53 20 53 C13 53 8 49 8 40 C8 30 10 14 20 14 Z" fill="url(#mcGBody)" />
        </g>
        <g id="mcFaceBits">
          <circle cx="15.5" cy="30" r="1.7" fill="#3a2d24" /><circle cx="24.5" cy="30" r="1.7" fill="#3a2d24" />
          <path d="M18.5 34.5 Q20 36.2 21.5 34.5" stroke="#3a2d24" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <circle cx="12.5" cy="33" r="2" fill="#d97757" opacity="0.22" /><circle cx="27.5" cy="33" r="2" fill="#d97757" opacity="0.22" />
        </g>
        <g id="mcBody"><use href="#mcBodyBlank" /><use href="#mcFaceBits" /></g>
        <g id="mcCapRed">
          <path d="M3 22 C3 8 10 3 20 3 C30 3 37 8 37 22 C31 18.5 26 20.5 20 20.5 C14 20.5 9 18.5 3 22 Z" fill="url(#mcGCapRed)" />
          <circle cx="12" cy="10.5" r="1.8" fill="#f4e6d0" opacity="0.9" /><circle cx="22" cy="7" r="1.4" fill="#f4e6d0" opacity="0.9" /><circle cx="28" cy="13" r="1.9" fill="#f4e6d0" opacity="0.9" />
          <ellipse cx="14" cy="7.5" rx="4" ry="1.8" fill="#ffffff" opacity="0.18" />
        </g>
        <g id="mcCapBlue">
          <path d="M3 22 C3 8 10 3 20 3 C30 3 37 8 37 22 C31 18.5 26 20.5 20 20.5 C14 20.5 9 18.5 3 22 Z" fill="url(#mcGCapBlue)" />
          <circle cx="13" cy="11" r="1.6" fill="#eaf2f7" opacity="0.9" /><circle cx="24" cy="7.5" r="1.4" fill="#eaf2f7" opacity="0.9" />
          <ellipse cx="14" cy="7.5" rx="4" ry="1.8" fill="#ffffff" opacity="0.18" />
        </g>
        <g id="mcCapYellow">
          <path d="M3 22 C3 8 10 3 20 3 C30 3 37 8 37 22 C31 18.5 26 20.5 20 20.5 C14 20.5 9 18.5 3 22 Z" fill="url(#mcGCapYellow)" />
          <ellipse cx="14" cy="7.5" rx="4" ry="1.8" fill="#ffffff" opacity="0.2" />
        </g>
        <g id="mcCapBrown">
          <path d="M3 22 C3 8 10 3 20 3 C30 3 37 8 37 22 C31 18.5 26 20.5 20 20.5 C14 20.5 9 18.5 3 22 Z" fill="url(#mcGCapBrown)" />
          <circle cx="26" cy="10" r="1.6" fill="#e8d5b8" opacity="0.8" /><ellipse cx="14" cy="7.5" rx="4" ry="1.8" fill="#ffffff" opacity="0.15" />
        </g>
        <g id="mcCapHat">
          <path d="M8 18 C8 8 13 4.5 20 4.5 C27 4.5 32 8 32 18 Z" fill="url(#mcGHat)" />
          <rect x="4.5" y="17" width="31" height="4.4" rx="2.2" fill="url(#mcGHat)" />
          <rect x="17.5" y="5.5" width="5" height="12" rx="2.4" fill="#ffffff" opacity="0.25" />
        </g>
        <g id="mcFlame">
          <path d="M13 1 C15 7 22 10 22 18 A9 9 0 0 1 4 18 C4 10 11 7 13 1 Z" fill="url(#mcGFlame)" />
          <path d="M13 10 C14 13 17.5 15 17.5 19.5 A4.5 4.5 0 0 1 8.5 19.5 C8.5 15 12 13 13 10 Z" fill="#f7d354" />
        </g>
        <g id="mcUmbCanopy">
          <path d="M2 21 A20 20 0 0 1 42 21 Z" fill="#c1442e" />
          <path d="M12 21 A10 16 0 0 1 32 21 Z" fill="#d97757" opacity="0.7" />
          <ellipse cx="14" cy="8" rx="6" ry="2.5" fill="#ffffff" opacity="0.25" />
        </g>
        <g id="mcSpark"><path d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z" fill="#f2b53c" /></g>
      </defs>
    </svg>
  );
}
