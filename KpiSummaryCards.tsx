import React from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { 
  WorklogTask, 
  MonthlyKpiActuals, 
  DEFAULT_KPI_TARGETS, 
  TaskCategory, 
  TaskStatus 
} from "../types";
import { 
  Layers, 
  Mail, 
  FileText, 
  Users, 
  MousePointerClick, 
  TrendingUp, 
  Plus, 
  Minus 
} from "lucide-react";

interface KpiSummaryCardsProps {
  tasks: WorklogTask[];
  actuals: MonthlyKpiActuals;
  onUpdateActuals: (updated: Partial<MonthlyKpiActuals>) => void;
}

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({
  tasks,
  actuals,
  onUpdateActuals,
}) => {
  const { t, language } = useThemeLanguage();

  // 1. Calculate Execution actuals from tasks
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
  
  // Social Posts: Count Content Marketing done tasks
  const socialPostsDone = completedTasks.filter(
    (t) => t.category === TaskCategory.CONTENT_MARKETING || t.kpiImpact === "Social Content"
  ).length;

  // Case study/insights: Content Marketing tasks with isCaseStudyOrInsight checked
  const caseStudiesDone = completedTasks.filter(
    (t) => 
      (t.category === TaskCategory.CONTENT_MARKETING || t.kpiImpact === "Social Content") && 
      t.isCaseStudyOrInsight
  ).length;

  // Email Campaigns: Done tasks in Campaign Management or Email Campaign impact
  const emailCampaignsDone = completedTasks.filter(
    (t) => t.category === TaskCategory.CAMPAIGN_MANAGEMENT || t.kpiImpact === "Email Campaign"
  ).length;

  // Sales Assets + Customer Marketing Case Studies
  const salesAssetsDone = completedTasks.filter(
    (t) => 
      t.category === TaskCategory.SALES_ENABLEMENT || 
      t.category === TaskCategory.CUSTOMER_MARKETING ||
      t.kpiImpact === "Sales Asset / Case Study"
  ).length;

  // Render a clean percentage indicator
  const getPercentStyle = (actual: number, target: number) => {
    const percent = Math.min(100, Math.round((actual / target) * 100));
    if (percent >= 100) return { width: `${percent}%`, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" };
    if (percent >= 50) return { width: `${percent}%`, color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" };
    return { width: `${percent}%`, color: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50" };
  };

  const execKPIs = [
    {
      title: t("kpiSocialContentTitle"),
      desc: t("kpiSocialContentDesc"),
      actual: socialPostsDone,
      target: DEFAULT_KPI_TARGETS.socialContentMin,
      maxTarget: DEFAULT_KPI_TARGETS.socialContentMax,
      icon: <Layers className="w-5 h-5 text-emerald-600" />,
      subMetric: {
        label: language === "vi" ? "Insight / Case study" : "Insight / Case studies",
        actual: caseStudiesDone,
        target: DEFAULT_KPI_TARGETS.socialCaseStudyMin,
      },
      unit: t("kpiUnitPosts")
    },
    {
      title: t("kpiEmailCampaignsTitle"),
      desc: t("kpiEmailCampaignsDesc"),
      actual: emailCampaignsDone,
      target: DEFAULT_KPI_TARGETS.emailCampaignsMin,
      icon: <Mail className="w-5 h-5 text-cyan-600" />,
      unit: t("kpiUnitCampaigns")
    },
    {
      title: t("kpiSalesAssetsTitle"),
      desc: t("kpiSalesAssetsDesc"),
      actual: salesAssetsDone,
      target: DEFAULT_KPI_TARGETS.salesAssetsMin,
      icon: <FileText className="w-5 h-5 text-violet-600" />,
      unit: t("kpiUnitAssets")
    },
  ];

  const convKPIs = [
    {
      title: t("kpiLeadsTitle"),
      desc: t("kpiLeadsDesc"),
      actual: actuals.leadsActual,
      target: DEFAULT_KPI_TARGETS.leadsMin,
      field: "leadsActual" as keyof MonthlyKpiActuals,
      icon: <Users className="w-5 h-5 text-orange-600" />,
      subMetric: {
        label: t("kpiMqlsTitle"),
        actual: actuals.mqlsActual,
        target: DEFAULT_KPI_TARGETS.mqlsMin,
        field: "mqlsActual" as keyof MonthlyKpiActuals,
      },
      unit: t("kpiUnitLeads")
    },
    {
      title: t("kpiWebConversionTitle"),
      desc: t("kpiWebConversionDesc"),
      actual: actuals.webConvActual,
      target: DEFAULT_KPI_TARGETS.webConvMin,
      field: "webConvActual" as keyof MonthlyKpiActuals,
      icon: <MousePointerClick className="w-5 h-5 text-teal-600" />,
      unit: t("kpiUnitConvs")
    },
    {
      title: t("kpiEmailContactsTitle"),
      desc: t("kpiEmailContactsDesc"),
      actual: actuals.emailContactsActual,
      target: DEFAULT_KPI_TARGETS.emailContactsMin,
      field: "emailContactsActual" as keyof MonthlyKpiActuals,
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      unit: t("kpiUnitEmails")
    },
  ];

  const adjustMetric = (field: keyof MonthlyKpiActuals, amount: number) => {
    const current = actuals[field] as number;
    onUpdateActuals({ [field]: Math.max(0, current + amount) });
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: EXECUTION KPIs */}
      <div>
        <div className="flex flex-col mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>
            {language === "vi" ? "Execution KPIs (Thực thi - Tự động tính từ Worklog)" : "Execution KPIs (Auto-calculated from Done tasks)"}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {execKPIs.map((kpi, idx) => {
            const hasRange = kpi.maxTarget !== undefined;
            const isCompleted = kpi.actual >= kpi.target;
            const progress = getPercentStyle(kpi.actual, kpi.target);

            return (
              <div 
                key={idx}
                className="glass-card rounded-2xl p-4.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="shrink-0">{kpi.icon}</span>
                      {kpi.title}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}>
                      {Math.min(100, Math.round((kpi.actual / kpi.target) * 100))}%
                    </span>
                  </div>

                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono mt-1">
                    {kpi.actual}{" "}
                    <span className="text-slate-400 text-xs font-normal">
                      / {hasRange ? `${kpi.target}-${kpi.maxTarget}` : kpi.target}
                    </span>
                  </div>
                  
                  <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">{kpi.desc}</p>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${progress.color}`}
                      style={{ width: progress.width }}
                    ></div>
                  </div>
                </div>

                {/* Optional Sub-Metric Tracker */}
                {kpi.subMetric && (
                  <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">{kpi.subMetric.label}:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[10px] ${
                      kpi.subMetric.actual >= kpi.subMetric.target ? "text-emerald-600 bg-emerald-50" : "text-indigo-600 bg-indigo-50"
                    }`}>
                      {kpi.subMetric.actual} / {kpi.subMetric.target} {kpi.unit}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CONVERSION KPIs */}
      <div>
        <div className="flex flex-col mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full inline-block"></span>
            {language === "vi" ? "Conversion KPIs (Hiệu số Chuyển đổi - Thay đổi thủ công)" : "Funnel Conversion KPIs (Interactive adjustments)"}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {convKPIs.map((kpi, idx) => {
            const isCompleted = kpi.actual >= kpi.target;
            const progress = getPercentStyle(kpi.actual, kpi.target);

            return (
              <div 
                key={idx}
                className="glass-card rounded-2xl p-4.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="shrink-0">{kpi.icon}</span>
                      {kpi.title}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}>
                      {Math.min(100, Math.round((kpi.actual / kpi.target) * 100))}%
                    </span>
                  </div>

                  {/* Interactive Counter Row */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
                      {kpi.actual}{" "}
                      <span className="text-slate-400 text-xs font-normal">/ {kpi.target}</span>
                    </div>

                    <div className="flex items-center gap-1 bg-white/70 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                      <button 
                        onClick={() => adjustMetric(kpi.field, -1)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        title={language === "vi" ? "Giảm 1" : "Decrease 1"}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => adjustMetric(kpi.field, 1)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        title={language === "vi" ? "Tăng 1" : "Increase 1"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">{kpi.desc}</p>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${progress.color}`}
                      style={{ width: progress.width }}
                    ></div>
                  </div>
                </div>

                {/* Optional Sub-Metric (e.g. MQLs under Leads) */}
                {kpi.subMetric && (
                  <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">{kpi.subMetric.label}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[10px] ${
                        kpi.subMetric.actual >= kpi.subMetric.target ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                      }`}>
                        {kpi.subMetric.actual} / {kpi.subMetric.target}
                      </span>
                      {kpi.subMetric.field && (
                        <div className="flex items-center gap-0.5 bg-white border border-slate-200/80 rounded-lg p-0.5 shadow-3xs">
                          <button 
                            onClick={() => adjustMetric(kpi.subMetric!.field!, -1)}
                            className="p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={() => adjustMetric(kpi.subMetric!.field!, 1)}
                            className="p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
