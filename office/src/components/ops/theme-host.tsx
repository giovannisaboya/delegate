import { useEffect } from "react";

const KEY = "nl-theme";

export function readTheme(): "day" | "night" {
  if (typeof window === "undefined") return "day";
  return localStorage.getItem(KEY) === "night" ? "night" : "day";
}

export function applyTheme(theme: "day" | "night") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(KEY, theme);
}

export function ThemeHost() {
  useEffect(() => {
    applyTheme(readTheme());
  }, []);
  return null;
}
