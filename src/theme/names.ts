export const THEME_NAMES = ["light", "dark"] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_STORAGE_KEY = "rt-theme";

export function isThemeName(value: string | null): value is ThemeName {
  return value === "light" || value === "dark";
}
