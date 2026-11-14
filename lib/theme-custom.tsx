"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ViewportMode = "auto" | "mobile" | "desktop";
export type ColorTheme = "system" | "dark" | "light" | "oled" | "purple" | "cyan";

interface ThemeContextType {
  viewportMode: ViewportMode;
  setViewportMode: (mode: ViewportMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  viewportMode: "auto",
  setViewportMode: () => {},
  colorTheme: "system",
  setColorTheme: () => {},
});

export const ThemeCustomProvider = ({ children }: { children: React.ReactNode }) => {
  const [viewportMode, setViewportModeState] = useState<ViewportMode>("auto");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("system");

  useEffect(() => {
    const savedViewport = localStorage.getItem("APP_VIEWPORT_MODE") as ViewportMode;
    if (savedViewport) setViewportModeState(savedViewport);

    const savedTheme = localStorage.getItem("APP_COLOR_THEME") as ColorTheme;
    if (savedTheme) setColorThemeState(savedTheme);
  }, []);

  const setViewportMode = (mode: ViewportMode) => {
    setViewportModeState(mode);
    localStorage.setItem("APP_VIEWPORT_MODE", mode);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem("APP_COLOR_THEME", theme);
    const root = document.documentElement;
    root.classList.remove("theme-oled", "theme-purple", "theme-cyan");
    if (theme === "oled") root.classList.add("theme-oled", "dark");
    if (theme === "purple") root.classList.add("theme-purple");
    if (theme === "cyan") root.classList.add("theme-cyan");
  };

  return (
    <ThemeContext.Provider value={{ viewportMode, setViewportMode, colorTheme, setColorTheme }}>
      <div className={viewportMode === "mobile" ? "max-w-[430px] mx-auto min-h-screen border-x shadow-2xl relative" : "w-full min-h-screen"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useThemeCustom = () => useContext(ThemeContext);
