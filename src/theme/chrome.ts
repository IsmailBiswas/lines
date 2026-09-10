import type { ThemeName } from "./names";

/**
 * Chrome tokens. Values are HSL channels without `hsl()`, so Tailwind
 * can use `hsl(var(--background))`.
 *
 * Experiment here. Keep the same keys on both themes.
 */
export type ChromeTokens = {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  "destructive-foreground": string;
  border: string;
  input: string;
  ring: string;
  editor: string;
};

export const chromeThemes: Record<ThemeName, ChromeTokens> = {
  light: {
    background: "0 0% 100%",
    foreground: "0 0% 9%",
    card: "0 0% 100%",
    "card-foreground": "0 0% 9%",
    popover: "0 0% 100%",
    "popover-foreground": "0 0% 9%",
    primary: "0 0% 9%",
    "primary-foreground": "0 0% 98%",
    secondary: "0 0% 96%",
    "secondary-foreground": "0 0% 9%",
    muted: "0 0% 96%",
    "muted-foreground": "0 0% 32%",
    accent: "0 0% 94%",
    "accent-foreground": "0 0% 9%",
    destructive: "0 0% 20%",
    "destructive-foreground": "0 0% 98%",
    border: "0 0% 86%",
    input: "0 0% 86%",
    ring: "0 0% 20%",
    editor: "0 0% 100%",
  },
  dark: {
    background: "235 18% 14%",
    foreground: "173 24% 93%",
    card: "233 18% 19%",
    "card-foreground": "173 24% 93%",
    popover: "233 18% 19%",
    "popover-foreground": "173 24% 93%",
    primary: "173 24% 93%",
    "primary-foreground": "235 18% 14%",
    secondary: "229 13% 26%",
    "secondary-foreground": "173 24% 93%",
    muted: "229 13% 26%",
    "muted-foreground": "202 8% 72%",
    accent: "229 13% 26%",
    "accent-foreground": "173 24% 93%",
    destructive: "202 8% 72%",
    "destructive-foreground": "235 18% 14%",
    border: "229 13% 26%",
    input: "226 9% 36%",
    ring: "202 8% 72%",
    editor: "233 18% 19%",
  },
};

export function applyChrome(theme: ThemeName) {
  const root = document.documentElement;
  const tokens = chromeThemes[theme];
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(`--${name}`, value);
  }
}
