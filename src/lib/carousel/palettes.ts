import type { CarouselPalette } from "./types";

/**
 * 12 palettes — from pure black & white to neon and vivid,
 * keeping a few soft pastels for the gentle themes.
 */
export const CAROUSEL_PALETTES: CarouselPalette[] = [
  // Black & white
  { id: "mono", label: "Black & White", accent: "#111111", deep: "#000000", lightBg: "#fafafa", darkBg: "#0a0a0a" },
  { id: "paper", label: "Paper", accent: "#333333", deep: "#111111", lightBg: "#ffffff", darkBg: "#141414" },
  // Neon
  { id: "neon", label: "Neon", accent: "#00ff41", deep: "#00cc34", lightBg: "#0d1117", darkBg: "#04070a" },
  { id: "cyber", label: "Cyber", accent: "#00e5ff", deep: "#0099cc", lightBg: "#0b1220", darkBg: "#060b14" },
  // Vivid
  { id: "electric", label: "Electric", accent: "#4d7cfe", deep: "#2746c9", lightBg: "#eef2ff", darkBg: "#141d3d" },
  { id: "coral", label: "Coral", accent: "#ff6b6b", deep: "#d63d3d", lightBg: "#fff0f0", darkBg: "#3a1616" },
  { id: "lime", label: "Lime", accent: "#a3e635", deep: "#5c8a10", lightBg: "#f4fbe8", darkBg: "#1a2408" },
  { id: "sunset", label: "Sunset", accent: "#ff9a5a", deep: "#e0552e", lightBg: "#fff3ec", darkBg: "#33180c" },
  // Soft pastel
  { id: "sage", label: "Sage", accent: "#7a9e7e", deep: "#4a6b4e", lightBg: "#eef4ee", darkBg: "#1f2a20" },
  { id: "sky", label: "Sky", accent: "#9ec7e0", deep: "#5b86a1", lightBg: "#eef6fb", darkBg: "#1c2730" },
  { id: "blush", label: "Blush", accent: "#e8a2ae", deep: "#a15c6b", lightBg: "#fdf0f2", darkBg: "#2b1f22" },
  { id: "lavender", label: "Lavender", accent: "#b3a4e3", deep: "#6d5fa6", lightBg: "#f4f1fb", darkBg: "#221f30" },
];
