import React from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { ColorTheme } from "../lib/translations";
import { X, Settings, Check, Globe, Palette } from "lucide-react";
import { motion } from "motion/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, themeColor, setThemeColor, t } = useThemeLanguage();

  if (!isOpen) return null;

  // Custom color options metadata
  const colorsList: { key: ColorTheme; hex: string; bgClass: string; textClass: string }[] = [
    { key: "teal", hex: "#34A7B2", bgClass: "bg-[#34A7B2]", textClass: "text-[#34A7B2]" },
    { key: "peach", hex: "#FFAE6E", bgClass: "bg-[#FFAE6E]", textClass: "text-[#FFAE6E]" },
    { key: "rose", hex: "#F59AA3", bgClass: "bg-[#F59AA3]", textClass: "text-[#F59AA3]" },
    { key: "wine", hex: "#5B2E35", bgClass: "bg-[#5B2E35]", textClass: "text-[#5B2E35]" },
    { key: "lavender", hex: "#B5B9F0", bgClass: "bg-[#B5B9F0]", textClass: "text-[#B5B9F0]" },
    { key: "sand", hex: "#F5E4C3", bgClass: "bg-[#F5E4C3]", textClass: "text-[#F5E4C3]" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden shadow-2xl border border-white/60 p-6 md:p-8 z-10">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-display">{t("settingsTitle")}</h3>
            <p className="text-xs text-slate-500">Configure your marketing workspace parameters</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* SECTION 1: LANGUAGE */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              {t("settingsLang")}
            </label>
            <p className="text-[11px] text-slate-400 leading-tight">
              {t("settingsLangDesc")}
            </p>
            
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* English (Main) */}
              <button
                onClick={() => setLanguage("en")}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold relative cursor-pointer ${
                  language === "en"
                    ? "bg-white border-indigo-400 text-indigo-700 shadow-sm ring-2 ring-indigo-100"
                    : "bg-white/40 border-slate-200 text-slate-500 hover:bg-white/70"
                }`}
              >
                <span className="text-lg">🇺🇸</span>
                <span>English (Primary)</span>
                {language === "en" && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>

              {/* Vietnamese (Secondary) */}
              <button
                onClick={() => setLanguage("vi")}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold relative cursor-pointer ${
                  language === "vi"
                    ? "bg-white border-indigo-400 text-indigo-700 shadow-sm ring-2 ring-indigo-100"
                    : "bg-white/40 border-slate-200 text-slate-500 hover:bg-white/70"
                }`}
              >
                <span className="text-lg">🇻🇳</span>
                <span>Tiếng Việt</span>
                {language === "vi" && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 2: COLOR ACCENT */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-500" />
              {t("settingsColor")}
            </label>
            <p className="text-[11px] text-slate-400 leading-tight">
              {t("settingsColorDesc")}
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {colorsList.map((col) => (
                <button
                  key={col.key}
                  onClick={() => setThemeColor(col.key)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-2 transition-all relative cursor-pointer ${
                    themeColor === col.key
                      ? "bg-white border-slate-300 shadow-sm ring-2 ring-slate-100 font-bold"
                      : "bg-white/40 border-slate-200/60 hover:bg-white/60"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${col.bgClass} flex items-center justify-center text-white shadow-xs`}>
                    {themeColor === col.key && <Check className="w-4 h-4 stroke-[3px]" />}
                  </div>
                  <span className="text-[10px] text-slate-600 text-center font-medium truncate max-w-full">
                    {t(`color${col.key.charAt(0).toUpperCase() + col.key.slice(1)}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200/50">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/15 hover:shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              {t("settingsSave")}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
