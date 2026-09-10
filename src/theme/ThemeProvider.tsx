import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { applyChrome } from "./chrome";
import { isThemeName, THEME_STORAGE_KEY, type ThemeName } from "./names";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ThemeName {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeName(stored)) return stored;
  return systemTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const next = readTheme();
    applyChrome(next);
    return next;
  });

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next) => {
        applyChrome(next);
        localStorage.setItem(THEME_STORAGE_KEY, next);
        setThemeState(next);
      },
      toggleTheme: () => {
        const next = theme === "dark" ? "light" : "dark";
        applyChrome(next);
        localStorage.setItem(THEME_STORAGE_KEY, next);
        setThemeState(next);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }
  return value;
}
