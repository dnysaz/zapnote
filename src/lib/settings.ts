export interface ThemeColors {
  primary: string;
  dark: string;
  darker: string;
  active: string;
  accent: string;
  soft: string;
  mid: string;
  text: string;
  card: string;
  cardBorder: string;
  cardTrack: string;
}

export type ThemeKey = keyof typeof THEMES;

export const THEMES = {
  emerald: {
    label: "Emerald",
    primary: "#234b42",
    dark: "#173b35",
    darker: "#254b43",
    active: "#2b574d",
    accent: "#c9e979",
    soft: "#d7e9d7",
    mid: "#477f67",
    text: "#2b604e",
    card: "#214a41",
    cardBorder: "#3a665a",
    cardTrack: "#386257",
  },
  ocean: {
    label: "Ocean",
    primary: "#1e5f74",
    dark: "#12404f",
    darker: "#1a4f60",
    active: "#2a6b81",
    accent: "#7fd3e8",
    soft: "#d3e8ee",
    mid: "#3f7f94",
    text: "#1e5f74",
    card: "#16414f",
    cardBorder: "#2a5d6e",
    cardTrack: "#2a5d6e",
  },
  violet: {
    label: "Violet",
    primary: "#5a4a9e",
    dark: "#3a2f6e",
    darker: "#4a3d85",
    active: "#6a5ab0",
    accent: "#c4b5f0",
    soft: "#e3def5",
    mid: "#7a6ab8",
    text: "#5a4a9e",
    card: "#3f3472",
    cardBorder: "#5a4d9a",
    cardTrack: "#5a4d9a",
  },
  rose: {
    label: "Rose",
    primary: "#a0405e",
    dark: "#7a2b45",
    darker: "#8d354f",
    active: "#b24d6b",
    accent: "#f0a5bb",
    soft: "#f3dde4",
    mid: "#c05f7b",
    text: "#a0405e",
    card: "#7e2e47",
    cardBorder: "#a44d67",
    cardTrack: "#a44d67",
  },
  amber: {
    label: "Amber",
    primary: "#a06a1e",
    dark: "#7a4e14",
    darker: "#8d5b17",
    active: "#b27c2b",
    accent: "#f0c77f",
    soft: "#f3e6d0",
    mid: "#c08a3a",
    text: "#a06a1e",
    card: "#7e5015",
    cardBorder: "#a46d2b",
    cardTrack: "#a46d2b",
  },
  slate: {
    label: "Slate",
    primary: "#475569",
    dark: "#334155",
    darker: "#3d4c61",
    active: "#556880",
    accent: "#b8c4d4",
    soft: "#e2e7ed",
    mid: "#6b7f99",
    text: "#475569",
    card: "#37465c",
    cardBorder: "#4d6078",
    cardTrack: "#4d6078",
  },
} as const satisfies Record<string, ThemeColors & { label: string }>;

export interface SiteSettings {
  siteName: string;
  theme: ThemeKey;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "ViNotes",
  theme: "emerald",
};

export const SETTINGS_ROW_ID = "site";

export const THEME_VAR_KEYS = [
  "primary",
  "dark",
  "darker",
  "active",
  "accent",
  "soft",
  "mid",
  "text",
  "card",
  "cardBorder",
  "cardTrack",
] as const;
