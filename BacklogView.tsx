import React, { useState } from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { BacklogTask, TaskCategory, TaskPriority, CATEGORY_STANDARDS } from "../types";
import { Plus, Trash2, Calendar, ClipboardList, AlertCircle, Info } from "lucide-react";

interface BacklogViewProps {
  backlogTasks: BacklogTask[];
  onAddBacklogTask: (task: Omit<BacklogTask, "id" | "createdAt">) => void;
  onDeleteBacklogTask: (id: string) => void;
  onMoveToWorklog: (task: BacklogTask, targetMonth?: string) => void;
  selectedMonth: string; // YYYY-MM
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  backlogTasks,
  onAddBacklogTask,
  onDeleteBacklogTask,
  onMoveToWorklog,
  selectedMonth,
}) => {
  const { t, language } = useThemeLanguage();

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>(TaskCategory.CONTENT_MARKETING);
  const [newPriority, setNewPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newNotes, setNewNotes] = useState("");
  
  // Track custom schedule configurations for each backlog task (defaulting to current selectedMonth)
  const [scheduleConfigs, setScheduleConfigs] = useState<Record<string, { month: string; year: string }>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddBacklogTask({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      notes: newNotes.trim(),
    });

    setNewTitle("");
    setNewNotes("");
  };

  const [year, month] = selectedMonth.split("-");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUMN 1: QUICK ADD FORM */}
      <div className="glass-panel rounded-2xl p-5 shadow-xs h-fit border border-white/60 bg-white/40">
        <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 mb-1 font-display">
          <ClipboardList className="w-5 h-5 text-indigo-600 animate-pulse" />
          {t("backlogAddTitle")}
        </h3>
        <p className="text-slate-400 text-xs mb-4">
          {t("backlogAddDesc")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t("backlogTitleLabel")}
            </label>
            <input 
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("backlogTitlePlaceholder")}
              className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t("backlogCategoryLabel")}
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            >
              {Object.values(TaskCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t("backlogPriorityLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(TaskPriority).map((prio) => (
                <button
                  type="button"
                  key={prio}
                  onClick={() => setNewPriority(prio)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    newPriority === prio
                      ? prio === TaskPriority.HIGH
                        ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200"
                        : prio === TaskPriority.MEDIUM
                          ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t("backlogNotesLabel")}
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder={t("backlogNotesPlaceholder")}
              rows={3}
              className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs"
            ></textarea>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t("backlogBtnAdd")}
          </button>
        </form>
      </div>

      {/* COLUMN 2-3: LIST & SCHEDULER BOARD */}
      <div className="col-span-1 lg:col-span-2 glass-panel rounded-2xl p-5 shadow-xs border border-white/60 bg-white/40 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-3 mb-4">
            <div>
              <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 font-display">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                {t("backlogListTitle")} ({backlogTasks.length} {language === "vi" ? "ý tưởng / task tồn đọng" : "backlog tasks"})
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {t("backlogListDesc")}
              </p>
            </div>
          </div>

          {backlogTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white/30 rounded-xl border border-white/40">
              <div className="flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-semibold">{t("backlogEmpty")}</p>
                <p className="text-xs text-slate-400">{t("backlogEmptySub")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {backlogTasks.map((task) => {
                const categoryConfig = CATEGORY_STANDARDS[task.category];

                return (
                  <div 
                    key={task.id}
                    className="group border border-slate-200/80 bg-white/60 rounded-2xl p-4.5 hover:border-indigo-300 hover:shadow-xs transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category Badge */}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${categoryConfig.bgColor} ${categoryConfig.color}`}>
                          {task.category}
                        </span>
                        
                        {/* Priority Badge */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.priority === TaskPriority.HIGH 
                            ? "bg-rose-50 text-rose-700" 
                            : task.priority === TaskPriority.MEDIUM 
                              ? "bg-amber-50 text-amber-700" 
                              : "bg-blue-50 text-blue-700"
                        }`}>
                          {task.priority} Priority
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {t("backlogCreatedDate")} {task.createdAt}
                        </span>
                      </div>

                      <h4 className="text-slate-900 font-bold text-sm leading-snug break-words">{task.title}</h4>
                      {task.notes && (
                        <p className="text-slate-400 text-xs leading-normal break-words">{task.notes}</p>
                      )}
                    </div>

                    {/* Quick schedule controls */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0 bg-white/80 border border-slate-200/80 p-2 rounded-2xl shadow-3xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                        {language === "vi" ? "Xếp vào:" : "Schedule to:"}
                      </span>
                      
                      {/* Month dropdown */}
                      <select
                        value={(() => {
                          const conf = scheduleConfigs[task.id];
                          return conf ? conf.month : month;
                        })()}
                        onChange={(e) => {
                          const currentConf = scheduleConfigs[task.id] || { month, year };
                          setScheduleConfigs((prev) => ({
                            ...prev,
                            [task.id]: { ...currentConf, month: e.target.value },
                          }));
                        }}
                        className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        title={language === "vi" ? "Chọn tháng" : "Select Month"}
                      >
                        {Array.from({ length: 12 }, (_, idx) => {
                          const mStr = String(idx + 1).padStart(2, "0");
                          return (
                            <option key={mStr} value={mStr}>
                              {language === "vi" ? `Tháng ${mStr}` : `Month ${mStr}`}
                            </option>
                          );
                        })}
                      </select>

                      {/* Year dropdown */}
                      <select
                        value={(() => {
                          const conf = scheduleConfigs[task.id];
                          return conf ? conf.year : year;
                        })()}
                        onChange={(e) => {
                          const currentConf = scheduleConfigs[task.id] || { month, year };
                          setScheduleConfigs((prev) => ({
                            ...prev,
                            [task.id]: { ...currentConf, year: e.target.value },
                          }));
                        }}
                        className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        title={language === "vi" ? "Chọn năm" : "Select Year"}
                      >
                        {["2025", "2026", "2027", "2028", "2029", "2030"].map((yStr) => (
                          <option key={yStr} value={yStr}>
                            {yStr}
                          </option>
                        ))}
                      </select>

                      {/* Schedule Button */}
                      <button
                        onClick={() => {
                          const conf = scheduleConfigs[task.id] || { month, year };
                          const targetMonthKey = `${conf.year}-${conf.month}`;
                          onMoveToWorklog(task, targetMonthKey);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title={t("backlogBtnSchedule")}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Go</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(t("backlogDeleteConfirm"))) {
                            onDeleteBacklogTask(task.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-md transition-all cursor-pointer"
                        title="Delete Idea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Backlog instruction footer */}
        {backlogTasks.length > 0 && (
          <div className="mt-4 p-3 bg-white/40 border border-white/50 rounded-xl flex items-start gap-2 text-xs text-slate-500 font-medium">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {language === "vi" ? (
                <>
                  <strong>Gợi ý:</strong> Khi click nút <strong>"Go"</strong>, task này sẽ tự động chuyển đổi thành 1 dòng công việc trong Worklog của tháng được chọn, lấy ngày thực tế của ngày hôm nay.
                </>
              ) : (
                <>
                  <strong>Tip:</strong> Clicking the <strong>"Go"</strong> button converts this backlog idea into an active scheduled task inside your Worklog for the selected month using today's date.
                </>
              )}
            </span>
          </div>
        )}

      </div>

    </div>
  );
};
