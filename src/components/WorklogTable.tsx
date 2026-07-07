import React, { useState, useRef, useCallback } from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { 
  WorklogTask, 
  TaskCategory, 
  TaskStatus, 
  TaskPriority, 
  CATEGORY_STANDARDS 
} from "../types";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Search, 
  Filter, 
  Check, 
  FileSpreadsheet, 
  Sparkles,
  Info,
  ExternalLink
} from "lucide-react";

interface WorklogTableProps {
  tasks: WorklogTask[];
  onAddTask: (task: Omit<WorklogTask, "id">) => void;
  onUpdateTask: (id: string, updated: Partial<WorklogTask>) => void;
  onDeleteTask: (id: string) => void;
  selectedMonth: string; // YYYY-MM
}

// Default column widths in pixels
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  row:    40,
  A:     140,
  B:     260,
  C:     190,
  D:     145,
  E:     115,
  F:     165,
  G:     200,
  H:     110,
  I:     195,
  actions: 48,
};

// Resize handle rendered inside each <th>
const ResizeHandle: React.FC<{
  colKey: string;
  onResize: (colKey: string, delta: number) => void;
}> = ({ colKey, onResize }) => {
  const startXRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startXRef.current;
        startXRef.current = ev.clientX;
        onResize(colKey, delta);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [colKey, onResize]
  );

  return (
    <span
      onMouseDown={handleMouseDown}
      title="Drag to resize column"
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "5px",
        cursor: "col-resize",
        userSelect: "none",
        zIndex: 10,
        borderRight: "2px solid transparent",
        transition: "border-color 0.15s",
      }}
      className="hover:border-r-indigo-400!"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderRightColor = "#818cf8"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderRightColor = "transparent"; }}
    />
  );
};

export const WorklogTable: React.FC<WorklogTableProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  selectedMonth,
}) => {
  const { t, language } = useThemeLanguage();

  // Column widths state
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS);

  const handleColResize = useCallback((colKey: string, delta: number) => {
    setColWidths((prev) => ({
      ...prev,
      [colKey]: Math.max(60, (prev[colKey] ?? 100) + delta),
    }));
  }, []);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Filter tasks based on selected month and user search/filters
  const filteredTasks = tasks.filter((task) => {
    // Match month YYYY-MM
    const taskMonth = task.date.substring(0, 7);
    if (taskMonth !== selectedMonth) return false;

    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (task.notes && task.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Dropdown filters
    const matchesCategory = categoryFilter === "All" || task.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Fast-add a task based on templates
  const addFromTemplate = (templateType: "social" | "email" | "sales" | "generic") => {
    const today = new Date();
    // Format as YYYY-MM-DD but ensure it uses the currently selected month's year/month
    const [year, month] = selectedMonth.split("-");
    const day = String(today.getDate()).padStart(2, "0");
    const taskDate = `${year}-${month}-${day}`;

    let template: Omit<WorklogTask, "id"> = {
      date: taskDate,
      title: t("untitledTask"),
      category: TaskCategory.CONTENT_MARKETING,
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      isCaseStudyOrInsight: false,
      kpiImpact: "None",
      notes: ""
    };

    if (templateType === "social") {
      template = {
        date: taskDate,
        title: language === "vi" ? "Bài viết Social Content [Chủ đề...]" : "Social Content Post [Topic...]",
        category: TaskCategory.CONTENT_MARKETING,
        status: TaskStatus.TO_DO,
        priority: TaskPriority.MEDIUM,
        isCaseStudyOrInsight: false,
        kpiImpact: "Social Content",
        notes: language === "vi" ? "Lên bài trên Facebook/LinkedIn" : "Post on Facebook/LinkedIn"
      };
    } else if (templateType === "email") {
      template = {
        date: taskDate,
        title: language === "vi" ? "Chiến dịch Email Marketing [Tên Campaign]" : "Email Marketing Campaign [Name]",
        category: TaskCategory.CAMPAIGN_MANAGEMENT,
        status: TaskStatus.TO_DO,
        priority: TaskPriority.HIGH,
        isCaseStudyOrInsight: false,
        kpiImpact: "Email Campaign",
        notes: language === "vi" ? "Gửi tệp khách hàng tiềm năng" : "Send to target lead database"
      };
    } else if (templateType === "sales") {
      template = {
        date: taskDate,
        title: language === "vi" ? "Tài liệu Sales Asset / Case Study [Khách hàng X]" : "Sales Asset / Case Study [Client X]",
        category: TaskCategory.SALES_ENABLEMENT,
        status: TaskStatus.TO_DO,
        priority: TaskPriority.HIGH,
        isCaseStudyOrInsight: true,
        kpiImpact: "Sales Asset / Case Study",
        notes: language === "vi" ? "Phục vụ đội ngũ Sales thúc đẩy chuyển đổi" : "For sales team to accelerate conversions"
      };
    }

    onAddTask(template);
  };

  // Add an empty generic row (like spreadsheet)
  const addEmptyRow = () => {
    const today = new Date();
    const [year, month] = selectedMonth.split("-");
    const day = String(today.getDate()).padStart(2, "0");
    const taskDate = `${year}-${month}-${day}`;

    onAddTask({
      date: taskDate,
      title: "",
      category: TaskCategory.CONTENT_MARKETING,
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      isCaseStudyOrInsight: false,
      kpiImpact: "None",
      notes: ""
    });
  };

  // Copy filtered rows to Clipboard formatted for direct Paste in Google Sheets
  const copyToClipboard = () => {
    if (filteredTasks.length === 0) return;

    // Headers
    const headers = [
      t("colDate"), 
      t("colTitle"), 
      t("colCategory"), 
      t("colStatus"), 
      t("colPriority"), 
      t("colInsight"), 
      t("colKpi"), 
      t("colNotes"), 
      t("colDuration"), 
      t("colLink")
    ];
    
    // Rows
    const rows = filteredTasks.map(tData => [
      tData.date,
      tData.title || t("untitledTask"),
      tData.category,
      tData.status,
      tData.priority,
      tData.isCaseStudyOrInsight ? t("yes") : t("no"),
      tData.kpiImpact || t("none"),
      tData.notes || "",
      tData.duration || "",
      tData.deliverableLink || ""
    ]);

    const content = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join("\t"))
      .join("\n");

    navigator.clipboard.writeText(content).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    });
  };

  // Export to CSV
  const downloadCSV = () => {
    if (filteredTasks.length === 0) return;

    const headers = [
      t("colDate"), 
      t("colTitle"), 
      t("colCategory"), 
      t("colStatus"), 
      t("colPriority"), 
      t("colInsight"), 
      t("colKpi"), 
      t("colNotes"), 
      t("colDuration"), 
      t("colLink")
    ];

    const rows = filteredTasks.map(tData => [
      tData.date,
      tData.title || "",
      tData.category,
      tData.status,
      tData.priority,
      tData.isCaseStudyOrInsight ? "Yes" : "No",
      tData.kpiImpact || "None",
      tData.notes || "",
      tData.duration || "",
      tData.deliverableLink || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Worklog_Marketing_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
      
      {/* 1. FILTER & TEMPLATE TOOLBAR */}
      <div className="p-4 bg-white/40 border-b border-slate-200/60 space-y-4">
        
        {/* Row A: Templates and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Templates add shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> {t("fastAddTitle")}
            </span>
            <button 
              onClick={() => addFromTemplate("social")}
              className="px-3 py-1.5 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Social Post
            </button>
            <button 
              onClick={() => addFromTemplate("email")}
              className="px-3 py-1.5 bg-cyan-50/70 hover:bg-cyan-100/80 text-cyan-700 border border-cyan-200/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Email Campaign
            </button>
            <button 
              onClick={() => addFromTemplate("sales")}
              className="px-3 py-1.5 bg-violet-50/70 hover:bg-violet-100/80 text-violet-700 border border-violet-200/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Sales Asset/Case Study
            </button>
          </div>

          {/* Export tools */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={copyToClipboard}
              disabled={filteredTasks.length === 0}
              className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
                filteredTasks.length === 0 
                  ? "bg-slate-50/50 text-slate-400 border-slate-200 cursor-not-allowed" 
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs cursor-pointer"
              }`}
              title={t("copyAlert")}
            >
              {copiedNotification ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                  <span className="text-emerald-600 font-bold">Copied Tab-Separated!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy to Google Sheets</span>
                </>
              )}
            </button>

            <button
              onClick={downloadCSV}
              disabled={filteredTasks.length === 0}
              className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filteredTasks.length === 0 
                  ? "bg-slate-50/50 text-slate-400 border-slate-200 cursor-not-allowed" 
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs cursor-pointer"
              }`}
              title={t("csvAlert")}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Row B: Search & Standard Spreadsheet-Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2.5 border-t border-slate-200/60">
          
          {/* Search bar */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 glass-input rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">{language === "vi" ? "Danh mục: Tất cả" : "Categories: All"}</option>
              {Object.values(TaskCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">{language === "vi" ? "Trạng thái: Tất cả" : "Status: All"}</option>
              {Object.values(TaskStatus).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">{language === "vi" ? "Độ ưu tiên: Tất cả" : "Priority: All"}</option>
              {Object.values(TaskPriority).map((prio) => (
                <option key={prio} value={prio}>{prio}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. SPREADSHEET RENDER CONTAINER */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-left" style={{ tableLayout: "fixed", width: Object.values(colWidths).reduce((a, b) => a + b, 0) }}>
          
          {/* Spreadsheet-like alphabetical columns (A, B, C...) */}
          <thead>
            <tr className="bg-slate-100/50">
              <th
                className="text-center text-[10px] text-slate-400 font-mono font-medium border-r border-slate-200 py-1 select-none"
                style={{ width: colWidths.row, minWidth: colWidths.row, position: "relative" }}
              >
                #
              </th>
              {([
                ["A", t("colDate")],
                ["B", t("colTitle")],
                ["C", t("colCategory")],
                ["D", t("colStatus")],
                ["E", t("colPriority")],
                ["F", t("colKpi")],
                ["G", t("colNotes")],
                ["H", t("colDuration")],
                ["I", t("colLink")],
              ] as [string, string][]).map(([col, label]) => (
                <th
                  key={col}
                  className="sheet-header-cell"
                  style={{ width: colWidths[col], minWidth: colWidths[col], position: "relative", overflow: "hidden" }}
                >
                  {col}: {label}
                  <ResizeHandle colKey={col} onResize={handleColResize} />
                </th>
              ))}
              <th
                className="border-b-2 border-slate-300 bg-slate-100/40 text-center text-slate-500 select-none"
                style={{ width: colWidths.actions }}
              />
            </tr>
          </thead>

          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 bg-white/40">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 animate-pulse" />
                    <p className="text-sm font-medium">{language === "vi" ? "Không tìm thấy task nào khớp với bộ lọc." : "No tasks found matching filter."}</p>
                    <p className="text-xs text-slate-400">{language === "vi" ? "Nhấp nút 'Thêm dòng công việc' hoặc các mẫu ở trên để tạo công việc mới." : "Click 'Add Empty Row' or select a template above to get started."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, rowIndex) => {
                const categoryConfig = CATEGORY_STANDARDS[task.category];

                return (
                  <tr 
                    key={task.id}
                    className="hover:bg-white/60 group transition-all duration-150 border-b border-slate-200/40 bg-white/30"
                  >
                    {/* Row index number (mimics spreadsheet rows 1, 2, 3...) */}
                    <td className="text-center font-mono text-xs text-slate-400 bg-slate-50/40 border-r border-slate-200/60 select-none">
                      {rowIndex + 1}
                    </td>

                    {/* A: Date Cell */}
                    <td className="sheet-cell">
                      <input 
                        type="date"
                        value={task.date}
                        onChange={(e) => onUpdateTask(task.id, { date: e.target.value })}
                        className="w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-slate-800 text-xs font-mono focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-hidden"
                      />
                    </td>

                    {/* B: Title Cell */}
                    <td className="sheet-cell">
                      <div className="flex items-center gap-1.5 w-full">
                        <input 
                          type="text"
                          value={task.title}
                          onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                          placeholder={t("taskPlaceholder")}
                          className="w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-slate-800 text-sm focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-hidden"
                        />
                      </div>
                    </td>

                    {/* C: Category Standard Dropdown */}
                    <td className="sheet-cell">
                      <select
                        value={task.category}
                        onChange={(e) => onUpdateTask(task.id, { category: e.target.value as TaskCategory })}
                        className={`w-full py-1 px-1.5 rounded-lg text-xs font-medium border border-transparent focus:bg-white focus:border-indigo-400 focus:outline-hidden ${categoryConfig.bgColor} ${categoryConfig.color}`}
                        title={categoryConfig.purpose}
                      >
                        {Object.values(TaskCategory).map((cat) => (
                          <option key={cat} value={cat} className="text-slate-800 bg-white">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* D: Status Dropdown */}
                    <td className="sheet-cell">
                      <select
                        value={task.status}
                        onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                        className={`w-full py-1 px-1.5 rounded-lg text-xs font-semibold border border-transparent focus:bg-white focus:border-indigo-400 focus:outline-hidden ${
                          task.status === TaskStatus.DONE 
                            ? "bg-emerald-50 text-emerald-700" 
                            : task.status === TaskStatus.IN_PROGRESS 
                              ? "bg-amber-50 text-amber-700" 
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {Object.values(TaskStatus).map((status) => (
                          <option key={status} value={status} className="text-slate-800 bg-white">
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* E: Priority Dropdown */}
                    <td className="sheet-cell">
                      <select
                        value={task.priority}
                        onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as TaskPriority })}
                        className={`w-full py-1 px-1.5 rounded-lg text-xs font-medium border border-transparent focus:bg-white focus:border-indigo-400 focus:outline-hidden ${
                          task.priority === TaskPriority.HIGH 
                            ? "bg-rose-50 text-rose-700" 
                            : task.priority === TaskPriority.MEDIUM 
                              ? "bg-amber-50 text-amber-700" 
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {Object.values(TaskPriority).map((prio) => (
                          <option key={prio} value={prio} className="text-slate-800 bg-white">
                            {prio}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* F: KPI Impact Select */}
                    <td className="sheet-cell">
                      <div className="flex flex-col gap-1 w-full">
                        <select
                          value={task.kpiImpact || "None"}
                          onChange={(e) => onUpdateTask(task.id, { kpiImpact: e.target.value as any })}
                          className="w-full bg-transparent border border-transparent rounded px-1 py-1 text-slate-700 text-xs focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                        >
                          <option value="None">- {t("none")} -</option>
                          <option value="Social Content">Social Content (12-15/mo)</option>
                          <option value="Email Campaign">Email Campaign (2/mo)</option>
                          <option value="Sales Asset / Case Study">Sales Asset (2/mo)</option>
                        </select>
                        
                        {/* If Social Content is selected, offer a toggle for 'Insight/CaseStudy' */}
                        {(task.kpiImpact === "Social Content" || task.category === TaskCategory.CONTENT_MARKETING) && (
                          <label className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium pl-1 select-none cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={task.isCaseStudyOrInsight}
                              onChange={(e) => onUpdateTask(task.id, { isCaseStudyOrInsight: e.target.checked })}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                            />
                            <span>Insight/CaseStudy (&gt;3)</span>
                          </label>
                        )}
                      </div>
                    </td>

                    {/* G: Notes Cell */}
                    <td className="sheet-cell">
                      <input 
                        type="text"
                        value={task.notes || ""}
                        onChange={(e) => onUpdateTask(task.id, { notes: e.target.value })}
                        placeholder={t("notesPlaceholder")}
                        className="w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-slate-600 text-xs focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-hidden"
                      />
                    </td>

                    {/* H: Duration Cell */}
                    <td className="sheet-cell">
                      <input 
                        type="text"
                        value={task.duration || ""}
                        onChange={(e) => onUpdateTask(task.id, { duration: e.target.value })}
                        placeholder="e.g. 4h, 2d"
                        className="w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-slate-800 text-xs font-mono focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-hidden"
                      />
                    </td>

                    {/* I: Deliverable Link Cell */}
                    <td className="sheet-cell">
                      <div className="flex items-center gap-1 w-full">
                        <input 
                          type="text"
                          value={task.deliverableLink || ""}
                          onChange={(e) => onUpdateTask(task.id, { deliverableLink: e.target.value })}
                          placeholder={t("linkPlaceholder")}
                          className="w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-slate-800 text-xs focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-hidden flex-1 min-w-0"
                        />
                        {task.deliverableLink && (
                          <a 
                            href={task.deliverableLink.startsWith('http') ? task.deliverableLink : `https://${task.deliverableLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-all shrink-0 cursor-pointer"
                            title="Open Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Actions: Delete row */}
                    <td className="text-center">
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. QUICK ROW INSERT BAR */}
      <div className="p-3 bg-white/40 border-t border-slate-200/60 flex justify-between items-center text-xs text-slate-500">
        <button 
          onClick={addEmptyRow}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" /> {t("addCustomTask")}
        </button>

        <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-100/50 rounded-lg px-3 py-1.5 text-indigo-700 font-medium">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{language === "vi" ? "Nhập dữ liệu nhanh trực tiếp vào các ô như Google Sheets. Thay đổi tự động lưu." : "Enter data directly into cells like Google Sheets. All changes save dynamically."}</span>
        </div>
      </div>

    </div>
  );
};
