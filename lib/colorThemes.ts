// Named 5-color aesthetics the user can pick between in Settings → Appearance.
// Each theme maps its 5 raw swatches onto the app's CSS custom properties
// (see src/index.css :root for the token list this mirrors).
export type ColorThemeId = "driftwood" | "urbanSlate" | "pearl" | "inkWash" | "jadePebble";

export const DEFAULT_COLOR_THEME: ColorThemeId = "driftwood";

interface ThemeVars {
  background: string; foreground: string;
  card: string; cardForeground: string;
  popover: string; popoverForeground: string;
  primary: string; primaryForeground: string;
  secondary: string; secondaryForeground: string;
  muted: string; mutedForeground: string;
  accent: string; accentForeground: string;
  destructive: string;
  border: string; input: string; ring: string;
  chart1: string; chart2: string; chart3: string; chart4: string; chart5: string;
  sidebar: string; sidebarForeground: string;
  sidebarPrimary: string; sidebarPrimaryForeground: string;
  sidebarAccent: string; sidebarAccentForeground: string;
  sidebarBorder: string; sidebarRing: string;
  clay: string; espresso: string; blush: string; slateBlue: string; sage: string;
}

export interface ColorTheme {
  id: ColorThemeId;
  label: string;
  description: string;
  swatches: string[]; // the 5 raw palette colors, in their original order — used for the picker legend
  vars: ThemeVars;
}

const DESTRUCTIVE = "#C1442E";

export const COLOR_THEMES: Record<ColorThemeId, ColorTheme> = {
  driftwood: {
    id: "driftwood",
    label: "Driftwood Pearl Morning",
    description: "Warm terracotta & espresso with a cool slate-blue accent",
    swatches: ["#BC7B6F", "#5A322A", "#E4A499", "#718A9E", "#CCCDC7"],
    vars: {
      background: "#FAF7F4", foreground: "#4A2A23",
      card: "#FFFFFF", cardForeground: "#4A2A23",
      popover: "#FFFFFF", popoverForeground: "#4A2A23",
      primary: "#5A322A", primaryForeground: "#FBF3EF",
      secondary: "#E4A499", secondaryForeground: "#4A2A23",
      muted: "#EDEAE4", mutedForeground: "#8A6F63",
      accent: "#718A9E", accentForeground: "#FFFFFF",
      destructive: DESTRUCTIVE,
      border: "#DDD9D0", input: "#DDD9D0", ring: "#BC7B6F",
      chart1: "#BC7B6F", chart2: "#718A9E", chart3: "#5A322A", chart4: "#E4A499", chart5: "#CCCDC7",
      sidebar: "#F3EFE9", sidebarForeground: "#4A2A23",
      sidebarPrimary: "#5A322A", sidebarPrimaryForeground: "#FBF3EF",
      sidebarAccent: "#E4A499", sidebarAccentForeground: "#4A2A23",
      sidebarBorder: "#DDD9D0", sidebarRing: "#BC7B6F",
      clay: "#BC7B6F", espresso: "#5A322A", blush: "#E4A499", slateBlue: "#718A9E", sage: "#CCCDC7",
    },
  },
  urbanSlate: {
    id: "urbanSlate",
    label: "Urban Slate",
    description: "Cool graphite and slate-blue with a dusty taupe accent",
    swatches: ["#E9E6E7", "#5E5653", "#7B7F8A", "#AB978C", "#6B7C98"],
    vars: {
      background: "#F7F6F6", foreground: "#3D3733",
      card: "#FFFFFF", cardForeground: "#3D3733",
      popover: "#FFFFFF", popoverForeground: "#3D3733",
      primary: "#5E5653", primaryForeground: "#F7F6F6",
      secondary: "#AB978C", secondaryForeground: "#3D3733",
      muted: "#ECEAE8", mutedForeground: "#857D77",
      accent: "#6B7C98", accentForeground: "#FFFFFF",
      destructive: DESTRUCTIVE,
      border: "#DFDBD8", input: "#DFDBD8", ring: "#6B7C98",
      chart1: "#6B7C98", chart2: "#AB978C", chart3: "#5E5653", chart4: "#7B7F8A", chart5: "#E9E6E7",
      sidebar: "#F1EFEE", sidebarForeground: "#3D3733",
      sidebarPrimary: "#5E5653", sidebarPrimaryForeground: "#F7F6F6",
      sidebarAccent: "#AB978C", sidebarAccentForeground: "#3D3733",
      sidebarBorder: "#DFDBD8", sidebarRing: "#6B7C98",
      clay: "#AB978C", espresso: "#5E5653", blush: "#7B7F8A", slateBlue: "#6B7C98", sage: "#E9E6E7",
    },
  },
  pearl: {
    id: "pearl",
    label: "Pearl",
    description: "Cream and sand warmed up with a lavender pop accent",
    swatches: ["#E9E3DE", "#A5937B", "#E3C49B", "#666161", "#AF9AC9"],
    vars: {
      background: "#FAF8F6", foreground: "#423E3E",
      card: "#FFFFFF", cardForeground: "#423E3E",
      popover: "#FFFFFF", popoverForeground: "#423E3E",
      primary: "#666161", primaryForeground: "#FAF8F6",
      secondary: "#E3C49B", secondaryForeground: "#423E3E",
      muted: "#F0EAE4", mutedForeground: "#8C8378",
      accent: "#AF9AC9", accentForeground: "#FFFFFF",
      destructive: DESTRUCTIVE,
      border: "#E4DDD5", input: "#E4DDD5", ring: "#AF9AC9",
      chart1: "#AF9AC9", chart2: "#A5937B", chart3: "#666161", chart4: "#E3C49B", chart5: "#E9E3DE",
      sidebar: "#F3EEE8", sidebarForeground: "#423E3E",
      sidebarPrimary: "#666161", sidebarPrimaryForeground: "#FAF8F6",
      sidebarAccent: "#E3C49B", sidebarAccentForeground: "#423E3E",
      sidebarBorder: "#E4DDD5", sidebarRing: "#AF9AC9",
      clay: "#AF9AC9", espresso: "#666161", blush: "#E3C49B", slateBlue: "#A5937B", sage: "#E9E3DE",
    },
  },
  inkWash: {
    id: "inkWash",
    label: "Ink Wash",
    description: "Monochrome graphite — near-black text on soft grays",
    swatches: ["#252525", "#CFCFCF", "#7D7D7D", "#545454"],
    vars: {
      background: "#F7F7F7", foreground: "#252525",
      card: "#FFFFFF", cardForeground: "#252525",
      popover: "#FFFFFF", popoverForeground: "#252525",
      primary: "#252525", primaryForeground: "#F7F7F7",
      secondary: "#CFCFCF", secondaryForeground: "#252525",
      muted: "#EDEDED", mutedForeground: "#7D7D7D",
      accent: "#545454", accentForeground: "#FFFFFF",
      destructive: DESTRUCTIVE,
      border: "#DEDEDE", input: "#DEDEDE", ring: "#7D7D7D",
      chart1: "#252525", chart2: "#545454", chart3: "#7D7D7D", chart4: "#A0A0A0", chart5: "#CFCFCF",
      sidebar: "#F2F2F2", sidebarForeground: "#252525",
      sidebarPrimary: "#252525", sidebarPrimaryForeground: "#F7F7F7",
      sidebarAccent: "#CFCFCF", sidebarAccentForeground: "#252525",
      sidebarBorder: "#DEDEDE", sidebarRing: "#7D7D7D",
      clay: "#545454", espresso: "#252525", blush: "#CFCFCF", slateBlue: "#7D7D7D", sage: "#CFCFCF",
    },
  },
  jadePebble: {
    id: "jadePebble",
    label: "Jade Pebble Morning",
    description: "Sage and forest green with a cool teal-gray accent",
    swatches: ["#7B9669", "#E6E6E6", "#6C8480", "#BAC8B1", "#404E3B"],
    vars: {
      background: "#F6F7F4", foreground: "#313D2C",
      card: "#FFFFFF", cardForeground: "#313D2C",
      popover: "#FFFFFF", popoverForeground: "#313D2C",
      primary: "#404E3B", primaryForeground: "#F6F7F4",
      secondary: "#BAC8B1", secondaryForeground: "#313D2C",
      muted: "#ECEFE7", mutedForeground: "#6E7C67",
      accent: "#6C8480", accentForeground: "#FFFFFF",
      destructive: DESTRUCTIVE,
      border: "#DEE3D7", input: "#DEE3D7", ring: "#7B9669",
      chart1: "#7B9669", chart2: "#6C8480", chart3: "#404E3B", chart4: "#BAC8B1", chart5: "#E6E6E6",
      sidebar: "#F0F2EC", sidebarForeground: "#313D2C",
      sidebarPrimary: "#404E3B", sidebarPrimaryForeground: "#F6F7F4",
      sidebarAccent: "#BAC8B1", sidebarAccentForeground: "#313D2C",
      sidebarBorder: "#DEE3D7", sidebarRing: "#7B9669",
      clay: "#7B9669", espresso: "#404E3B", blush: "#BAC8B1", slateBlue: "#6C8480", sage: "#E6E6E6",
    },
  },
};

export const COLOR_THEME_LIST: ColorTheme[] = Object.values(COLOR_THEMES);

const VAR_NAME_MAP: Record<keyof ThemeVars, string> = {
  background: "--background", foreground: "--foreground",
  card: "--card", cardForeground: "--card-foreground",
  popover: "--popover", popoverForeground: "--popover-foreground",
  primary: "--primary", primaryForeground: "--primary-foreground",
  secondary: "--secondary", secondaryForeground: "--secondary-foreground",
  muted: "--muted", mutedForeground: "--muted-foreground",
  accent: "--accent", accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border", input: "--input", ring: "--ring",
  chart1: "--chart-1", chart2: "--chart-2", chart3: "--chart-3", chart4: "--chart-4", chart5: "--chart-5",
  sidebar: "--sidebar", sidebarForeground: "--sidebar-foreground",
  sidebarPrimary: "--sidebar-primary", sidebarPrimaryForeground: "--sidebar-primary-foreground",
  sidebarAccent: "--sidebar-accent", sidebarAccentForeground: "--sidebar-accent-foreground",
  sidebarBorder: "--sidebar-border", sidebarRing: "--sidebar-ring",
  clay: "--clay", espresso: "--espresso", blush: "--blush", slateBlue: "--slate-blue", sage: "--sage",
};

export function getColorTheme(id: string | undefined): ColorTheme {
  return (id && COLOR_THEMES[id as ColorThemeId]) || COLOR_THEMES[DEFAULT_COLOR_THEME];
}

// Writes a theme's values onto :root as inline custom properties, overriding
// the CSS file's defaults so switching is instant and needs no reload.
export function applyColorTheme(id: string | undefined) {
  if (typeof document === "undefined") return;
  const theme = getColorTheme(id);
  const root = document.documentElement.style;
  (Object.keys(theme.vars) as (keyof ThemeVars)[]).forEach((key) => {
    root.setProperty(VAR_NAME_MAP[key], theme.vars[key]);
  });
}
