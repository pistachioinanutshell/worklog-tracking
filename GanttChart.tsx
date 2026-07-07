import React, { useMemo } from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { WorklogTask, TaskCategory, CATEGORY_STANDARDS, TaskStatus } from "../types";
import { Calendar, Clock, ExternalLink, Milestone, Layers } from "lucide-react";

interface GanttChartProps {
  tasks: WorklogTask[];
  selectedMonth: string; // YYYY-MM
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, selectedMonth }) => {
  const { t, language } = useThemeLanguage();

  // Parse year and month
  const [year, month] = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split("-");
    return [parseInt(yStr) || 2026, parseInt(mStr) || 7];
  }, [selectedMonth]);

  // Number of days in the month
  const numDays = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Days array (1 to 28/30/31)
  const daysArray = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => i + 1);
  }, [numDays]);

  // Helper to parse duration string (e.g. "3d", "1w", "4h") into calendar days span
  const parseDurationDays = (durationStr?: string): number => {
    if (!durationStr || durationStr.trim() === "") return 1;
    const cleanStr = durationStr.toLowerCase().trim();
    
    // Check for days (e.g., "3d", "3 days")
    const dayMatch = cleanStr.match(/^(\d+)\s*d/);
    if (dayMatch) return Math.max(1, parseInt(dayMatch[1]));
    
    // Check for weeks (e.g., "1w", "1 week")
    const weekMatch = cleanStr.match(/^(\d+)\s*w/);
    if (weekMatch) return Math.max(1, parseInt(weekMatch[1]) * 7);

    // If it mentions hours like "4h", it's less than a day, so we represent it as 1 day block
    const hourMatch = cleanStr.match(/^(\d+)\s*h/);
    if (hourMatch) return 1;

    // Check for raw numbers (fallback)
    const numMatch = cleanStr.match(/^(\d+)$/);
    if (numMatch) return Math.max(1, parseInt(numMatch[1]));

    return 1;
  };

  // Helper to get day name
  const getWeekdayName = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const daysVi = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return language === "vi" ? daysVi[dayOfWeek] : daysEn[dayOfWeek];
  };

  // Filter tasks to only those in the current month
  const monthlyTasks = useMemo(() => {
    return tasks.filter((t) => t.date.substring(0, 7) === selectedMonth);
  }, [tasks, selectedMonth]);

  // Group tasks by category and compute non-overlapping lanes
  const categoryGanttData = useMemo(() => {
    const data: Array<{
      category: TaskCategory;
      lanes: WorklogTask[][];
    }> = [];

    // Filter categories that have standard configurations
    Object.values(TaskCategory).forEach((cat) => {
      const catTasks = monthlyTasks.filter((t) => t.category === cat);
      if (catTasks.length === 0) return;

      // Lane-packing algorithm to stack overlapping tasks
      const lanes: WorklogTask[][] = [];
      
      // Sort tasks by date to pack them efficiently
      const sortedTasks = [...catTasks].sort((a, b) => a.date.localeCompare(b.date));

      sortedTasks.forEach((task) => {
        const taskDay = parseInt(task.date.substring(8, 10)) || 1;
        const span = parseDurationDays(task.duration);
        const start = taskDay;
        const end = Math.min(numDays, taskDay + span - 1);

        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
          // Check if this task overlaps with any existing task in this lane
          const hasOverlap = lanes[i].some((existing) => {
            const eDay = parseInt(existing.date.substring(8, 10)) || 1;
            const eSpan = parseDurationDays(existing.duration);
            const eStart = eDay;
            const eEnd = Math.min(numDays, eDay + eSpan - 1);
            return start <= eEnd && end >= eStart;
          });

          if (!hasOverlap) {
            lanes[i].push(task);
            placed = true;
            break;
          }
        }

        if (!placed) {
          lanes.push([task]);
        }
      });

      data.push({
        category: cat,
        lanes,
      });
    });

    return data;
  }, [monthlyTasks, numDays]);

  const cellWidth = 40; // width of each day cell in px

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
      {/* HEADER BAR */}
      <div className="p-4 border-b border-slate-200 bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 font-display">
            <Milestone className="w-5 h-5 text-indigo-600" />
            {t("ganttTitle")}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">
            {t("ganttDesc")}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span>
            <span>{language === "vi" ? "Chưa làm (To Do)" : "To Do"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400"></span>
            <span>{language === "vi" ? "Đang làm (In Progress)" : "In Progress"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></span>
            <span>{language === "vi" ? "Hoàn thành (Done)" : "Done"}</span>
          </div>
        </div>
      </div>

      {categoryGanttData.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white/40">
          <div className="flex flex-col items-center justify-center gap-2">
            <Calendar className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold">{t("ganttNoTasks")}</p>
            <p className="text-xs text-slate-400">{language === "vi" ? "Thêm công việc vào bảng Worklog ở trên để xem biểu đồ Gantt tự động cập nhật." : "Add tasks in the Worklog tab to generate the roadmap layout."}</p>
          </div>
        </div>
      ) : (
        /* GANTT SCROLLER */
        <div className="overflow-x-auto">
          <div className="min-w-max flex flex-col bg-white/30">
            
            {/* TIMELINE HEADERS */}
            <div className="flex border-b border-slate-200 bg-slate-100/50">
              {/* Left axis label placeholder */}
              <div className="w-64 shrink-0 border-r border-slate-200/80 p-3 flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                <Layers className="w-3.5 h-3.5 text-indigo-500 mr-1.5" /> {t("ganttCategoryLabel")}
              </div>

              {/* Day numbers & names */}
              <div className="flex flex-1">
                {daysArray.map((day) => {
                  const dayName = getWeekdayName(day);
                  const isWeekend = dayName === "T7" || dayName === "CN" || dayName === "Sat" || dayName === "Sun";
                  return (
                    <div
                      key={day}
                      style={{ width: cellWidth }}
                      className={`shrink-0 text-center py-2 text-[10px] font-mono border-r border-slate-100/60 flex flex-col justify-center ${
                        isWeekend ? "bg-amber-50/40 text-amber-600/80 font-bold" : "text-slate-500"
                      }`}
                    >
                      <span className="font-bold">{day}</span>
                      <span className="text-[8px] opacity-75">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIMELINE BODY */}
            <div className="divide-y divide-slate-200/40">
              {categoryGanttData.map(({ category, lanes }) => {
                const catConfig = CATEGORY_STANDARDS[category];
                // Calculate dynamic row height based on lanes
                const laneHeight = 36; // px
                const rowHeight = lanes.length * laneHeight + 16; // lane spacing + padding

                return (
                  <div key={category} className="flex group hover:bg-white/40 transition-colors">
                    
                    {/* Left Axis: Category Info card */}
                    <div className="w-64 shrink-0 border-r border-slate-200 p-3 flex flex-col justify-center bg-white/10">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block max-w-max ${catConfig.bgColor} ${catConfig.color}`}>
                        {category}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic font-medium">
                        {catConfig.purpose}
                      </span>
                    </div>

                    {/* Right Grid Area */}
                    <div 
                      className="flex-1 relative" 
                      style={{ height: rowHeight }}
                    >
                      {/* Grid Background Lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {daysArray.map((day) => {
                          const dayName = getWeekdayName(day);
                          const isWeekend = dayName === "T7" || dayName === "CN" || dayName === "Sat" || dayName === "Sun";
                          return (
                            <div
                              key={day}
                              style={{ width: cellWidth }}
                              className={`h-full shrink-0 border-r border-slate-100/60 ${
                                isWeekend ? "bg-amber-50/10" : ""
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Gantt Bars Layer */}
                      <div className="absolute inset-0 py-2">
                        {lanes.map((laneTasks, laneIndex) => {
                          const topOffset = laneIndex * laneHeight + 8;

                          return laneTasks.map((task) => {
                            const taskDay = parseInt(task.date.substring(8, 10)) || 1;
                            const spanDays = parseDurationDays(task.duration);
                            
                            // Calculate left and width positions
                            const leftPos = (taskDay - 1) * cellWidth;
                            // Width is capped so it doesn't run off the end of the month
                            const actualSpan = Math.min(spanDays, numDays - taskDay + 1);
                            const barWidth = actualSpan * cellWidth - 4; // 4px margin between pills

                            // Select color theme based on status
                            let statusClasses = "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300";
                            if (task.status === TaskStatus.DONE) {
                              statusClasses = "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300";
                            } else if (task.status === TaskStatus.IN_PROGRESS) {
                              statusClasses = "bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-300";
                            }

                            return (
                              <div
                                key={task.id}
                                style={{
                                  left: `${leftPos + 2}px`, // 2px start gap
                                  width: `${Math.max(12, barWidth)}px`,
                                  top: `${topOffset}px`,
                                  height: `${laneHeight - 8}px`,
                                }}
                                className={`absolute rounded-md border text-[10px] px-2 flex items-center justify-between font-bold cursor-pointer transition-all duration-150 shadow-2xs select-none group/bar ${statusClasses}`}
                                title={`${task.title} (${task.date} | Duration: ${task.duration || "1d"} | Status: ${task.status})`}
                              >
                                <span className="truncate pr-1">
                                  {task.title || `(${t("untitledTask")})`}
                                </span>
                                
                                {task.duration && (
                                  <span className="shrink-0 font-mono text-[8px] bg-white/70 px-1 rounded-sm text-slate-600 font-bold">
                                    {task.duration}
                                  </span>
                                )}

                                {/* Hover tooltip details card */}
                                <div className="absolute hidden group-hover/bar:flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl z-50 w-72 left-0 top-full mt-1 border border-slate-700 pointer-events-auto">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                    <span className="font-bold text-[9px] text-indigo-400 uppercase tracking-wider">{category}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      task.status === TaskStatus.DONE 
                                        ? "bg-emerald-500/20 text-emerald-400" 
                                        : task.status === TaskStatus.IN_PROGRESS 
                                          ? "bg-indigo-500/20 text-indigo-400" 
                                          : "bg-slate-500/20 text-slate-400"
                                    }`}>
                                      {task.status}
                                    </span>
                                  </div>
                                  <p className="font-bold text-xs text-slate-100">{task.title || `(${t("untitledTask")})`}</p>
                                  
                                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 pt-1">
                                    <div className="flex items-center gap-1 font-medium">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      <span>{t("colDate")}: {task.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-medium">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>{t("colDuration")}: {task.duration || "1d"}</span>
                                    </div>
                                  </div>

                                  {task.notes && (
                                    <p className="text-[10px] text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-800/80 mt-1 line-clamp-2 leading-relaxed">
                                      {task.notes}
                                    </p>
                                  )}

                                  {task.deliverableLink && (
                                    <a
                                      href={task.deliverableLink.startsWith('http') ? task.deliverableLink : `https://${task.deliverableLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1.5 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>{language === "vi" ? "Xem tài liệu Deliverable" : "Open Deliverable"}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
