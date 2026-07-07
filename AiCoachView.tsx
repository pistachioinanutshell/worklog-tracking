import React, { useState, useEffect } from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { WorklogTask, MonthlyKpiActuals } from "../types";
import Markdown from "react-markdown";
import { 
  Sparkles, 
  Brain, 
  RefreshCw, 
  Copy, 
  Check, 
  Zap, 
  Target, 
  FileText 
} from "lucide-react";

interface AiCoachViewProps {
  tasks: WorklogTask[];
  actuals: MonthlyKpiActuals;
  backlogTasks: any[];
  selectedMonth: string; // YYYY-MM
}

const LOADING_STEPS_EN = [
  "Analyzing worklog workflow trends...",
  "Correlating actual performance with growth targets...",
  "Computing category standards distribution ratios...",
  "Identifying primary funnel conversion bottlenecks...",
  "Drafting strategic suggestions & creative campaigns...",
  "Finalizing Growth Coach AI advisory report..."
];

const LOADING_STEPS_VI = [
  "Đang phân tích dòng chảy công việc trong Worklog...",
  "Đang đối chiếu hiệu suất thực tế với mục tiêu KPIs Growth...",
  "Đang tính toán mức độ phân bổ danh mục (Content, Demand Gen, CRO...)",
  "Gemini đang suy luận các điểm nghẽn chuyển đổi chính...",
  "Đang phác thảo 3 khuyến nghị chiến thuật đột phá & ý tưởng Campaign...",
  "Hoàn thiện báo cáo phân tích Growth & Product Marketing..."
];

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  tasks,
  actuals,
  backlogTasks,
  selectedMonth,
}) => {
  const { t, language } = useThemeLanguage();

  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const activeLoadingSteps = language === "vi" ? LOADING_STEPS_VI : LOADING_STEPS_EN;

  // Cycle through loading steps during generation
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % activeLoadingSteps.length);
      }, 2500);
    } else {
      setLoadingStepIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading, activeLoadingSteps]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setAnalysis("");
    
    try {
      // Filter tasks only for the selected month to send to Gemini
      const monthlyTasks = tasks.filter(tData => tData.date.substring(0, 7) === selectedMonth);

      const response = await fetch("/api/analyze-worklog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          kpis: actuals,
          worklog: monthlyTasks,
          backlog: backlogTasks,
          language, // Pass current language selection
        }),
      });

      if (!response.ok) {
        throw new Error(language === "vi" ? "Lỗi máy chủ khi gửi phân tích. Vui lòng thử lại!" : "Server error requesting analysis. Please retry!");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const [year, month] = selectedMonth.split("-");
  const monthLabel = language === "vi" ? `Tháng ${month}/${year}` : `${month}/${year}`;

  return (
    <div className="space-y-6">
      
      {/* 1. INTRO PANEL */}
      <div className="bg-linear-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 lg:p-8 shadow-md border border-white/10 relative overflow-hidden">
        
        {/* Abstract background decorative blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              {t("aiCoachSubtitle")}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
              {t("aiCoachTitle")} ({monthLabel})
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              {t("aiCoachDesc")}
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 shrink-0 disabled:bg-slate-700 disabled:text-slate-400 disabled:scale-100 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t("aiCoachBtnRunning")}</span>
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 animate-pulse" />
                <span>{t("aiCoachBtnRun")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. LOADING STATE */}
      {loading && (
        <div className="glass-panel border border-slate-200 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-4 bg-white/40">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <Brain className="w-6 h-6 text-indigo-600 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
          </div>
          <div className="space-y-2 mt-2">
            <p className="text-slate-800 font-extrabold text-base font-display">
              {t("aiCoachLoadingTitle")}
            </p>
            <p className="text-indigo-600 text-xs font-bold animate-pulse">
              {activeLoadingSteps[loadingStepIdx]}
            </p>
            <p className="text-slate-400 text-[11px] max-w-md mx-auto pt-2 font-medium">
              {t("aiCoachLoadingDesc")}
            </p>
          </div>
        </div>
      )}

      {/* 3. ERROR STATE */}
      {error && (
        <div className="bg-rose-50 border border-rose-200/60 rounded-2xl p-5 flex items-start gap-3 shadow-xs">
          <div className="p-1 rounded bg-rose-100 text-rose-700 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-rose-900 font-bold text-sm">{t("aiCoachErrorTitle")}</h4>
            <p className="text-rose-700 text-xs mt-0.5">{error}</p>
            <button 
              onClick={handleAnalyze} 
              className="mt-3 text-xs font-bold text-rose-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t("aiCoachErrorRetry")}
            </button>
          </div>
        </div>
      )}

      {/* 4. RESULTS DISPLAY */}
      {analysis && !loading && (
        <div className="glass-panel border border-slate-200/60 rounded-3xl overflow-hidden shadow-xs bg-white/40">
          
          {/* Result Header */}
          <div className="px-6 py-4 bg-white/50 border-b border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <h3 className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" /> {t("aiCoachResultTitle")} ({monthLabel})
              </h3>
            </div>

            <button
              onClick={copyToClipboard}
              className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                copied 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs cursor-pointer"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t("aiCoachCopied")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("aiCoachBtnCopy")}</span>
                </>
              )}
            </button>
          </div>

          {/* Markdown Content Container */}
          <div className="p-6 md:p-8 bg-white/20">
            <div className="markdown-body prose prose-slate max-w-none prose-sm md:prose-base prose-headings:font-display prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800 prose-code:font-mono prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 font-medium leading-relaxed">
              <Markdown>{analysis}</Markdown>
            </div>
          </div>

          {/* Quick takeaway summary notes */}
          <div className="px-6 py-4 bg-white/50 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-bold">
              <Target className="w-4 h-4 text-indigo-600" />
              {language === "vi" ? "Khuyến nghị trên được tối ưu cho Growth & Product Marketer theo Category Standard." : "Advisory optimized for Growth Marketers using Category Standards."}
            </span>
            <span className="text-[11px] font-mono font-bold">
              Model: Gemini 3.5 Flash
            </span>
          </div>

        </div>
      )}

      {/* 5. PLACEHOLDER STATE */}
      {!analysis && !loading && !error && (
        <div className="glass-panel border border-slate-200 rounded-3xl p-12 text-center shadow-xs bg-white/40 border-white/60">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
              <Brain className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-slate-900 font-extrabold text-lg font-display">{t("aiCoachPlaceholderTitle")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                {t("aiCoachPlaceholderDesc")}
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span>{t("aiCoachBtnTrigger")}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
