import type { CarouselFont } from "./types";

/** Web-safe font stacks — rendered as JPEG so must not rely on webfonts. */
export const CAROUSEL_FONTS: CarouselFont[] = [
  { id: "inter", label: "Inter / Modern", stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: "georgia", label: "Georgia / Editorial", stack: "Georgia, 'Times New Roman', serif" },
  { id: "poppins", label: "Poppins / Round", stack: "'Segoe UI', 'Trebuchet MS', Verdana, sans-serif" },
  { id: "mono", label: "Mono / Hacker", stack: "'Courier New', Courier, monospace" },
  { id: "impact", label: "Impact / Poster", stack: "Impact, 'Arial Black', sans-serif" },
  { id: "tahoma", label: "Tahoma / Clean", stack: "Tahoma, 'Geneva', sans-serif" },
];
