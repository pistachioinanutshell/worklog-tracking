import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, ColorTheme } from "./translations";

interface ThemeLanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  themeColor: ColorTheme;
  setThemeColor: (color: ColorTheme) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

export const ThemeLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial states from localStorage with defaults
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("workspace_language");
    return (saved === "vi" || saved === "en") ? (saved as Language) : "en"; // English is main/default
  });

  const [themeColor, setThemeColorState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem("workspace_theme_color");
    const validColors: ColorTheme[] = ["teal", "peach", "rose", "wine", "lavender", "sand"];
    return validColors.includes(saved as ColorTheme) ? (saved as ColorTheme) : "teal";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("workspace_language", lang);
  };

  const setThemeColor = (color: ColorTheme) => {
    setThemeColorState(color);
    localStorage.setItem("workspace_theme_color", color);
  };

  // Sync color theme classes to document element
  useEffect(() => {
    const root = document.documentElement;
    const themeClasses = ["theme-teal", "theme-peach", "theme-rose", "theme-wine", "theme-lavender", "theme-sand"];
    
    // Remove old classes
    themeClasses.forEach((cls) => root.classList.remove(cls));
    
    // Add current class
    root.classList.add(`theme-${themeColor}`);
  }, [themeColor]);

  // Translation helper function
  const t = (key: string, variables?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let translation = (dict as any)[key] || (translations.en as any)[key] || key;

    if (variables) {
      Object.entries(variables).forEach(([k, val]) => {
        translation = translation.replace(new RegExp(`{${k}}`, "g"), String(val));
      });
    }

    return translation;
  };

  return (
    <ThemeLanguageContext.Provider value={{ language, setLanguage, themeColor, setThemeColor, t }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLanguage = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error("useThemeLanguage must be used within a ThemeLanguageProvider");
  }
  return context;
};
