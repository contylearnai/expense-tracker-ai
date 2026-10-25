import type { Category } from "./types";

/** CSS custom properties defined in globals.css, so light/dark steps swap automatically. */
export const CATEGORY_COLOR: Record<Category, string> = {
  Food: "var(--cat-food)",
  Transportation: "var(--cat-transportation)",
  Entertainment: "var(--cat-entertainment)",
  Shopping: "var(--cat-shopping)",
  Bills: "var(--cat-bills)",
  Other: "var(--cat-other)",
};

export const CATEGORY_ICON: Record<Category, string> = {
  Food: "🍽️",
  Transportation: "🚗",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Bills: "🧾",
  Other: "📦",
};
