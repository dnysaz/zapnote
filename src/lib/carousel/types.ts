import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

/** A single carousel card's data. */
export type CarouselCardData = {
  icon: string;
  title: string;
  body: string[];
};

/** Light/dark background variant. */
export type CardTone = "light" | "dark";

/** Color palette definition. */
export type CarouselPalette = {
  id: string;
  label: string;
  /** Accent color — icons, chips, rules. */
  accent: string;
  /** Deep shade of the accent — text on light cards. */
  deep: string;
  /** Soft tinted background (light variant). */
  lightBg: string;
  /** Soft tinted background (dark variant). */
  darkBg: string;
};

/** A named font stack usable on cards (must be web-safe, exported to JPEG). */
export type CarouselFont = {
  id: string;
  label: string;
  /** CSS font-family value. */
  stack: string;
};

/** Context passed to every theme render. */
export type CarouselThemeContext = {
  card: CarouselCardData;
  index: number;
  total: number;
  brandName: string;
  palette: CarouselPalette;
  tone: CardTone;
  font: CarouselFont;
  /** Resolved icon component for this card. */
  Icon: LucideIcon;
};

/**
 * A carousel theme (template).
 * `render` receives the card data + resolved palette/tone/font and must
 * return a full-bleed 1080x1350 card (use CARD_W / CARD_H for sizing).
 */
export type CarouselTheme = {
  id: string;
  label: string;
  /** Short description shown in the picker. */
  badge: string;
  /** Default tone when this theme is selected. */
  tone: CardTone;
  /** Default font for this theme. */
  fontId: string;
  render: (ctx: CarouselThemeContext) => React.ReactElement;
};

export const CARD_W = 1080;
export const CARD_H = 1350;

export type { CSSProperties };
