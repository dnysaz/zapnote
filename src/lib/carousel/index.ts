import type { CarouselTheme } from "./types";
import { CAROUSEL_PALETTES } from "./palettes";
import { CAROUSEL_FONTS } from "./fonts";
import theme1 from "./themes/theme1";
import theme2 from "./themes/theme2";
import theme3 from "./themes/theme3";
import theme4 from "./themes/theme4";
import theme5 from "./themes/theme5";
export * from "./types";
export * from "./palettes";
export * from "./fonts";

/** All available carousel themes. */
export const CAROUSEL_THEMES: CarouselTheme[] = [
  theme1,
  theme2,
  theme3,
  theme4,
  theme5,
];

/** Resolve a theme by id (falls back to the first theme). */
export function getTheme(id: string): CarouselTheme {
  return CAROUSEL_THEMES.find((t) => t.id === id) ?? CAROUSEL_THEMES[0];
}

/** Resolve a palette by id (falls back to the first palette). */
export function getPalette(id: string) {
  return CAROUSEL_PALETTES.find((p) => p.id === id) ?? CAROUSEL_PALETTES[0];
}

/** Resolve a font by id (falls back to the first font). */
export function getFont(id: string) {
  return CAROUSEL_FONTS.find((f) => f.id === id) ?? CAROUSEL_FONTS[0];
}
