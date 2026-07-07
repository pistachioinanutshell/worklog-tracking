import { useState, useEffect } from "react";
import { useThemeLanguage } from "../lib/ThemeLanguageContext";
import { 
  WorklogTask, 
  BacklogTask, 
  MonthlyKpiActuals, 
  TaskCategory, 
  TaskStatus, 
  TaskPriority 
} from "../types";
import { 
  FileSpreadsheet, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Lock, 
  Loader2, 
  Compass, 
  Trash2,
  FileDown,
  Upload
} from "lucide-react";
import { getCachedAccessToken, signInWithGoogle } from "../lib/firebase";

interface SheetsSyncViewProps {
  tasks: WorklogTask[];
  backlogTasks: BacklogTask[];
  kpiActuals: MonthlyKpiActuals[];
  selectedMonth: string;
  onImportTasks: (newTasks: WorklogTask[]) => void;
  onImportBacklogs: (newBacklogs: BacklogTask[]) => void;
  onImportKpis: (newKpiActuals: MonthlyKpiActuals[]) => void;
}

export default function SheetsSyncView({
  tasks,
  backlogTasks,
  kpiActuals,
  selectedMonth,
  onImportTasks,
  onImportBacklogs,
  onImportKpis
}: SheetsSyncViewProps) {
  const { t, language } = useThemeLanguage();

  const [token, setToken] = useState<string | null>(getCachedAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  
  // Spreadsheet Config
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("sheets_spreadsheet_id") || "";
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem("sheets_spreadsheet_url") || "";
  });

  // Import State
  const [inputUrlOrId, setInputUrlOrId] = useState<string>("");
  const [importPreview, setImportPreview] = useState<{
    tasks: any[];
    backlogs: any[];
    kpis: any[];
    sheetName: string;
  } | null>(null);
  const [activeImportTab, setActiveImportTab] = useState<"tasks" | "backlogs" | "kpis">("tasks");

  // Keep token synced
  useEffect(() => {
    const interval = setInterval(() => {
      const activeToken = getCachedAccessToken();
      if (activeToken !== token) {
        setToken(activeToken);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [token]);

  const showStatus = (text: string, type: "success" | "error" | "info" = "info") => {
    setStatusMsg({ text, type });
    if (type !== "info") {
      setTimeout(() => setStatusMsg(null), 8000);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      const activeToken = getCachedAccessToken();
      setToken(activeToken);
      if (activeToken) {
        showStatus(t("sheetsConnected"), "success");
      } else {
        // signInWithRedirect was initiated — page will reload
        showStatus(
          language === "vi"
            ? "Đang chuyển hướng đến trang đăng nhập Google..."
            : "Redirecting to Google sign-in page...",
          "info"
        );
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || String(err);
      showStatus(
        (language === "vi" ? "Lỗi kết nối Google: " : "Google connection error: ") + msg,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Extract Spreadsheet ID from URL if user pastes a full link
  const extractSpreadsheetId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  };

  const handleSaveExistingId = () => {
    const id = extractSpreadsheetId(inputUrlOrId);
    if (!id) {
      showStatus(t("sheetsInvalidId"), "error");
      return;
    }
    setSpreadsheetId(id);
    const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
    setSpreadsheetUrl(url);
    localStorage.setItem("sheets_spreadsheet_id", id);
    localStorage.setItem("sheets_spreadsheet_url", url);
    setInputUrlOrId("");
    showStatus(language === "vi" ? "Đã liên kết Google Sheets thành công!" : "Linked Google Sheets successfully!", "success");
  };

  const handleClearLinkedSheet = () => {
    if (window.confirm(t("sheetsBtnUnlinkConfirm"))) {
      setSpreadsheetId("");
      setSpreadsheetUrl("");
      localStorage.removeItem("sheets_spreadsheet_id");
      localStorage.removeItem("sheets_spreadsheet_url");
      setImportPreview(null);
      showStatus(t("sheetsUnlinkMsg"), "info");
    }
  };

  // Helper: Call Sheets API fetcher
  const callSheetsApi = async (url: string, options: RequestInit = {}) => {
    const activeToken = getCachedAccessToken() || token;
    if (!activeToken) {
      throw new Error(language === "vi" ? "Chưa kết nối Google Auth hoặc Token đã hết hạn. Vui lòng kết nối lại." : "Not connected to Google Auth or token expired. Please reconnect.");
    }
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${activeToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  };

  // CREATE & EXPORT TO GOOGLE SHEETS
  const handleExportToSheets = async () => {
    if (!token) {
      showStatus(language === "vi" ? "Vui lòng click 'Kết nối Google' trước khi xuất dữ liệu" : "Please connect Google Account before exporting", "error");
      return;
    }

    setLoading(true);
    showStatus(language === "vi" ? "Đang khởi tạo Google Spreadsheet mới..." : "Initializing new Google Spreadsheet...", "info");

    try {
      // 1. Create Spreadsheet
      const title = `Growth & Product Workspace (${selectedMonth})`;
      const createRes = await callSheetsApi("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        body: JSON.stringify({
          properties: { title }
        })
      });

      const newId = createRes.spreadsheetId;
      const newUrl = createRes.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newId}/edit`;

      showStatus(language === "vi" ? "Đang thiết lập các sheets (Worklog, Backlogs, KPI Actuals)..." : "Setting up worksheets (Worklog, Backlogs, KPI Actuals)...", "info");

      // 2. Add required sheets and rename Default Sheet1
      await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${newId}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  title: "Worklog"
                },
                fields: "title"
              }
            },
            {
              addSheet: {
                properties: {
                  title: "Backlogs"
                }
              }
            },
            {
              addSheet: {
                properties: {
                  title: "KPI Actuals"
                }
              }
            }
          ]
        })
      });

      showStatus(language === "vi" ? "Đang ghi dữ liệu vào Google Sheets..." : "Writing data to Google Sheets...", "info");

      // 3. Prepare data rows
      // A. Worklog rows
      const worklogHeaders = [
        "ID", "Ngày", "Tiêu đề", "Danh mục", "Trạng thái", "Độ ưu tiên", 
        "Thời lượng", "Tập trung KPI", "Case Study/Insight", "Link sản phẩm", "Ghi chú"
      ];
      const worklogRows = tasks.map(tData => [
        tData.id,
        tData.date,
        tData.title,
        tData.category,
        tData.status,
        tData.priority,
        tData.duration || "",
        tData.kpiImpact || "None",
        tData.isCaseStudyOrInsight ? "Yes" : "No",
        tData.deliverableLink || "",
        tData.notes || ""
      ]);

      // B. Backlogs rows
      const backlogHeaders = ["ID", "Ngày tạo", "Tiêu đề", "Danh mục", "Độ ưu tiên", "Ghi chú"];
      const backlogRows = backlogTasks.map(b => [
        b.id,
        b.createdAt,
        b.title,
        b.category,
        b.priority,
        b.notes || ""
      ]);

      // C. KPI Actuals rows
      const kpiHeaders = ["Tháng", "Leads Thực tế", "MQLs Thực tế", "Web Conversion (%)", "Email Contacts Thực tế"];
      const kpiRows = kpiActuals.map(k => [
        k.monthKey,
        k.leadsActual,
        k.mqlsActual,
        k.webConvActual,
        k.emailContactsActual
      ]);

      // Write values batch
      await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${newId}/values:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: [
            {
              range: "Worklog!A1",
              values: [worklogHeaders, ...worklogRows]
            },
            {
              range: "Backlogs!A1",
              values: [backlogHeaders, ...backlogRows]
            },
            {
              range: "KPI Actuals!A1",
              values: [kpiHeaders, ...kpiRows]
            }
          ]
        })
      });

      // Save spreadsheet credentials locally
      setSpreadsheetId(newId);
      setSpreadsheetUrl(newUrl);
      localStorage.setItem("sheets_spreadsheet_id", newId);
      localStorage.setItem("sheets_spreadsheet_url", newUrl);

      showStatus(language === "vi" ? "Xuất dữ liệu Google Sheets thành công!" : "Exported to Google Sheets successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showStatus((language === "vi" ? "Lỗi xuất Sheets: " : "Sheets export error: ") + (err.message || String(err)), "error");
    } finally {
      setLoading(false);
    }
  };

  // QUICK SYNC (OVERWRITE LINKED SHEET)
  const handleQuickSync = async () => {
    if (!spreadsheetId) return;
    setLoading(true);
    showStatus(language === "vi" ? "Đang đồng bộ đè dữ liệu lên Google Sheets..." : "Syncing details to Google Sheets...", "info");

    try {
      const worklogHeaders = [
        "ID", "Ngày", "Tiêu đề", "Danh mục", "Trạng thái", "Độ ưu tiên", 
        "Thời lượng", "Tập trung KPI", "Case Study/Insight", "Link sản phẩm", "Ghi chú"
      ];
      const worklogRows = tasks.map(tData => [
        tData.id,
        tData.date,
        tData.title,
        tData.category,
        tData.status,
        tData.priority,
        tData.duration || "",
        tData.kpiImpact || "None",
        tData.isCaseStudyOrInsight ? "Yes" : "No",
        tData.deliverableLink || "",
        tData.notes || ""
      ]);

      const backlogHeaders = ["ID", "Ngày tạo", "Tiêu đề", "Danh mục", "Độ ưu tiên", "Ghi chú"];
      const backlogRows = backlogTasks.map(b => [
        b.id,
        b.createdAt,
        b.title,
        b.category,
        b.priority,
        b.notes || ""
      ]);

      const kpiHeaders = ["Tháng", "Leads Thực tế", "MQLs Thực tế", "Web Conversion (%)", "Email Contacts Thực tế"];
      const kpiRows = kpiActuals.map(k => [
        k.monthKey,
        k.leadsActual,
        k.mqlsActual,
        k.webConvActual,
        k.emailContactsActual
      ]);

      // Clear old content to avoid overhang issues
      await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
        method: "POST",
        body: JSON.stringify({
          ranges: ["Worklog!A1:Z1000", "Backlogs!A1:Z1000", "KPI Actuals!A1:Z1000"]
        })
      });

      // Write values
      await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: [
            {
              range: "Worklog!A1",
              values: [worklogHeaders, ...worklogRows]
            },
            {
              range: "Backlogs!A1",
              values: [backlogHeaders, ...backlogRows]
            },
            {
              range: "KPI Actuals!A1",
              values: [kpiHeaders, ...kpiRows]
            }
          ]
        })
      });

      showStatus(language === "vi" ? "Cập nhật dữ liệu lên Google Sheets thành công!" : "Updated Google Sheets successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showStatus((language === "vi" ? "Lỗi đồng bộ: " : "Sync error: ") + (err.message || String(err)), "error");
    } finally {
      setLoading(false);
    }
  };

  // FETCH & PREVIEW GOOGLE SHEETS DATA
  const handleFetchPreview = async () => {
    if (!spreadsheetId) {
      showStatus(language === "vi" ? "Chưa có ID bảng tính để nạp dữ liệu" : "No spreadsheet linked to fetch", "error");
      return;
    }
    setLoading(true);
    showStatus(language === "vi" ? "Đang kéo dữ liệu từ Google Sheets..." : "Fetching Google Sheets records...", "info");

    try {
      const getMeta = await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
      const sheetTitles: string[] = getMeta.sheets?.map((s: any) => s.properties?.title) || [];

      let importedTasks: any[] = [];
      let importedBacklogs: any[] = [];
      let importedKpis: any[] = [];

      // Read Worklog
      if (sheetTitles.includes("Worklog")) {
        const res = await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Worklog!A1:Z500`);
        const rows = res.values || [];
        if (rows.length > 1) {
          const headers = rows[0].map((h: string) => h.trim());
          importedTasks = rows.slice(1).map((row: any[], index: number) => {
            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx >= 0 && idx < row.length ? row[idx] : "";
            };
            return {
              id: getVal("ID") || `task-sheet-${Date.now()}-${index}`,
              date: getVal("Ngày") || new Date().toISOString().split("T")[0],
              title: getVal("Tiêu đề") || "Untitled",
              category: (Object.values(TaskCategory).includes(getVal("Danh mục") as TaskCategory) 
                ? getVal("Danh mục") 
                : TaskCategory.CONTENT_MARKETING) as TaskCategory,
              status: (Object.values(TaskStatus).includes(getVal("Trạng thái") as TaskStatus)
                ? getVal("Trạng thái")
                : TaskStatus.TO_DO) as TaskStatus,
              priority: (Object.values(TaskPriority).includes(getVal("Độ ưu tiên") as TaskPriority)
                ? getVal("Độ ưu tiên")
                : TaskPriority.MEDIUM) as TaskPriority,
              duration: getVal("Thời lượng") || "",
              kpiImpact: getVal("Tập trung KPI") || "None",
              isCaseStudyOrInsight: getVal("Case Study/Insight") === "Yes" || getVal("Case Study/Insight") === "true",
              deliverableLink: getVal("Link sản phẩm") || "",
              notes: getVal("Ghi chú") || ""
            };
          });
        }
      }

      // Read Backlogs
      if (sheetTitles.includes("Backlogs")) {
        const res = await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Backlogs!A1:Z500`);
        const rows = res.values || [];
        if (rows.length > 1) {
          const headers = rows[0].map((h: string) => h.trim());
          importedBacklogs = rows.slice(1).map((row: any[], index: number) => {
            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx >= 0 && idx < row.length ? row[idx] : "";
            };
            return {
              id: getVal("ID") || `backlog-sheet-${Date.now()}-${index}`,
              createdAt: getVal("Ngày tạo") || new Date().toISOString().split("T")[0],
              title: getVal("Tiêu đề") || "Untitled",
              category: (Object.values(TaskCategory).includes(getVal("Danh mục") as TaskCategory) 
                ? getVal("Danh mục") 
                : TaskCategory.CONTENT_MARKETING) as TaskCategory,
              priority: (Object.values(TaskPriority).includes(getVal("Độ ưu tiên") as TaskPriority)
                ? getVal("Độ ưu tiên")
                : TaskPriority.MEDIUM) as TaskPriority,
              notes: getVal("Ghi chú") || ""
            };
          });
        }
      }

      // Read KPI Actuals
      if (sheetTitles.includes("KPI Actuals")) {
        const res = await callSheetsApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/KPI%20Actuals!A1:Z500`);
        const rows = res.values || [];
        if (rows.length > 1) {
          const headers = rows[0].map((h: string) => h.trim());
          importedKpis = rows.slice(1).map((row: any[], index: number) => {
            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx >= 0 && idx < row.length ? row[idx] : "";
            };
            return {
              monthKey: getVal("Tháng") || selectedMonth,
              leadsActual: Number(getVal("Leads Thực tế") || 0),
              mqlsActual: Number(getVal("MQLs Thực tế") || 0),
              webConvActual: Number(getVal("Web Conversion (%)") || 0),
              emailContactsActual: Number(getVal("Email Contacts Thực tế") || 0)
            };
          });
        }
      }

      setImportPreview({
        background: "glass-card",
        tasks: importedTasks,
        backlogs: importedBacklogs,
        kpis: importedKpis,
        sheetName: getMeta.properties?.title || "Google Sheet"
      } as any);

      showStatus(
        language === "vi" 
          ? `Đã nạp bản xem trước! Tìm thấy ${importedTasks.length} Worklogs, ${importedBacklogs.length} Backlogs, ${importedKpis.length} KPIs`
          : `Preview loaded! Found ${importedTasks.length} Worklogs, ${importedBacklogs.length} Backlogs, ${importedKpis.length} KPIs`, 
        "success"
      );
    } catch (err: any) {
      console.error(err);
      showStatus((language === "vi" ? "Lỗi kéo dữ liệu: " : "Error loading data: ") + (err.message || String(err)), "error");
    } finally {
      setLoading(false);
    }
  };

  // APPLY IMPORT
  const handleApplyImport = () => {
    if (!importPreview) return;

    const countTasks = importPreview.tasks.length;
    const countBacklogs = importPreview.backlogs.length;
    const countKpis = importPreview.kpis.length;

    const confirmMsg = language === "vi"
      ? `Đồng ý nhập ${countTasks} Worklogs, ${countBacklogs} Backlogs và ${countKpis} KPIs thực tế vào ứng dụng của bạn?`
      : `Are you sure you want to import ${countTasks} Worklogs, ${countBacklogs} Backlogs, and ${countKpis} KPIs into local workspace?`;

    if (window.confirm(confirmMsg)) {
      if (countTasks > 0) onImportTasks(importPreview.tasks);
      if (countBacklogs > 0) onImportBacklogs(importPreview.backlogs);
      if (countKpis > 0) onImportKpis(importPreview.kpis);

      setImportPreview(null);
      showStatus(language === "vi" ? "Đã đồng bộ nhập dữ liệu Google Sheets vào ứng dụng thành công!" : "Imported Google Sheets data into local workspace!", "success");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUMN 1: GOOGLE SHEETS ACCESS CONTROLS */}
      <div className="glass-panel border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5 lg:col-span-1 bg-white/40 border-white/60">
        <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200/50">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{language === "vi" ? "Trạng thái Google Sheets" : "Google Sheets Integration"}</h4>
            <p className="text-[10px] text-slate-400 font-medium">{language === "vi" ? "Kết nối & Cấp quyền Google Drive" : "Connect & Sync with Google Drive"}</p>
          </div>
        </div>

        {/* CONNECTION STATUS CARD */}
        <div className="bg-white/50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">{language === "vi" ? "Xác thực:" : "Authentication:"}</span>
            {token ? (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[9px] tracking-wide">
                <Check className="w-3 h-3" /> {language === "vi" ? "ĐÃ KẾT NỐI" : "CONNECTED"}
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[9px] tracking-wide">
                <Lock className="w-3 h-3" /> {language === "vi" ? "CHƯA KẾT NỐI" : "DISCONNECTED"}
              </span>
            )}
          </div>

          <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
            {t("sheetsDesc")}
          </p>

          {!token ? (
            <div className="space-y-2">
              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {t("sheetsBtnConnect")}
              </button>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                {language === "vi"
                  ? "Nếu cửa sổ bật lên bị chặn, trình duyệt sẽ chuyển hướng tự động."
                  : "If a popup is blocked, the browser will redirect automatically."}
              </p>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 font-mono bg-white p-2 rounded-lg border border-slate-200 truncate font-semibold">
              Token: Active (In-Memory)
            </div>
          )}
        </div>

        {/* CURRENT LINKED SHEET */}
        {spreadsheetId ? (
          <div className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider font-mono">{language === "vi" ? "Bảng tính đang liên kết" : "Linked Spreadsheet"}</span>
                <h5 className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[180px]">
                  ID: {spreadsheetId}
                </h5>
              </div>
              <button 
                onClick={handleClearLinkedSheet}
                className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                title={t("sheetsBtnUnlink")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <a 
                href={spreadsheetUrl} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {language === "vi" ? "Mở Google Sheets" : "Open Google Sheets"}
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={handleQuickSync}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {language === "vi" ? "Cập nhật ghi đè" : "Push Updates (Override)"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">{language === "vi" ? "Cách 1: Khởi tạo mới" : "Method 1: Export New"}</span>
            <button
              onClick={handleExportToSheets}
              disabled={loading || !token}
              className={`w-full font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                token 
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {t("sheetsBtnExport")}
            </button>
          </div>
        )}

        {/* LINK EXISTING SHEET */}
        <div className="bg-white/50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">{language === "vi" ? "Cách 2: Liên kết Link Sheets" : "Method 2: Link Existing"}</span>
          <div className="space-y-2">
            <input 
              type="text"
              placeholder={t("sheetsEnterIdPlaceholder")}
              value={inputUrlOrId}
              onChange={(e) => setInputUrlOrId(e.target.value)}
              className="w-full text-xs py-2 px-2.5 glass-input rounded-lg focus:outline-hidden"
            />
            <button
              onClick={handleSaveExistingId}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer"
            >
              {t("sheetsBtnLink")}
            </button>
          </div>
        </div>
      </div>

      {/* COLUMN 2 & 3: IMPORT PREVIEW & WORKSPACE */}
      <div className="glass-panel border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-5 flex flex-col justify-between bg-white/40 border-white/60">
        
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">{language === "vi" ? "Nhập dữ liệu từ Google Sheets" : "Import Sheets Data"}</h4>
              <p className="text-[10px] text-slate-400 font-medium">{language === "vi" ? "Nạp dữ liệu từ các sheet: Worklog, Backlogs, KPI Actuals" : "Fetch records from Worklog, Backlogs, and KPI Actuals sheets"}</p>
            </div>
            
            {spreadsheetId && (
              <button
                onClick={handleFetchPreview}
                disabled={loading || !token}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {language === "vi" ? "Nạp bản xem trước" : "Load Preview"}
              </button>
            )}
          </div>

          {/* STATUS NOTIFICATION AREA */}
          {statusMsg && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              statusMsg.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : statusMsg.type === "error" 
                  ? "bg-rose-50 border-rose-200 text-rose-800" 
                  : "bg-blue-50 border-blue-200 text-blue-800"
            }`}>
              {statusMsg.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="font-medium">{statusMsg.text}</span>
            </div>
          )}

          {/* NO PREVIEW STATE */}
          {!importPreview ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3.5 max-w-sm mx-auto my-6 bg-white/10">
              <div className="mx-auto w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                <Compass className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-800">{language === "vi" ? "Chưa có bản xem trước nào được nạp" : "No preview loaded"}</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  {language === "vi" 
                    ? "Vui lòng liên kết một bảng tính và click nút \"Nạp bản xem trước\" ở trên để xem trước danh sách hàng cần nhập." 
                    : "Link a Google Sheet and click the \"Load Preview\" button above to preview contents before importing."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/80 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs text-slate-600 font-semibold shadow-3xs">
                <span>{language === "vi" ? "Đang hiển thị dữ liệu từ:" : "Showing data from:"} <strong className="text-slate-800">{importPreview.sheetName}</strong></span>
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold font-mono">PREVIEW</span>
              </div>

              {/* TABS FOR DIFFERENT SHEETS IMPORT PREVIEW */}
              <div className="flex border-b border-slate-200 text-xs">
                <button
                  onClick={() => setActiveImportTab("tasks")}
                  className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeImportTab === "tasks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Worklog ({importPreview.tasks.length})
                </button>
                <button
                  onClick={() => setActiveImportTab("backlogs")}
                  className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeImportTab === "backlogs" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Backlogs ({importPreview.backlogs.length})
                </button>
                <button
                  onClick={() => setActiveImportTab("kpis")}
                  className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeImportTab === "kpis" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  KPI Actuals ({importPreview.kpis.length})
                </button>
              </div>

              {/* PREVIEW CONTAINER */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-white/80">
                {activeImportTab === "tasks" && (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                        <th className="p-2">{t("colDate")}</th>
                        <th className="p-2">{t("colTitle")}</th>
                        <th className="p-2">{t("colCategory")}</th>
                        <th className="p-2">{t("colStatus")}</th>
                        <th className="p-2">KPI Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {importPreview.tasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-semibold">{language === "vi" ? "Không tìm thấy bản ghi nào trên sheet Worklog" : "No records found on Worklog sheet"}</td>
                        </tr>
                      ) : (
                        importPreview.tasks.map((tData, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-slate-500 font-mono font-bold">{tData.date}</td>
                            <td className="p-2 font-bold text-slate-800 truncate max-w-[150px]">{tData.title}</td>
                            <td className="p-2"><span className="px-1.5 py-0.5 rounded-sm bg-slate-100 border text-slate-600 font-semibold">{tData.category}</span></td>
                            <td className="p-2"><span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 font-bold">{tData.status}</span></td>
                            <td className="p-2 text-slate-500 font-bold">{tData.kpiImpact}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeImportTab === "backlogs" && (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                        <th className="p-2">{t("backlogCreatedDate")}</th>
                        <th className="p-2">{t("colTitle")}</th>
                        <th className="p-2">{t("colCategory")}</th>
                        <th className="p-2">{t("colPriority")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {importPreview.backlogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 font-semibold">{language === "vi" ? "Không tìm thấy bản ghi nào trên sheet Backlogs" : "No records found on Backlogs sheet"}</td>
                        </tr>
                      ) : (
                        importPreview.backlogs.map((b, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-slate-500 font-mono font-bold">{b.createdAt}</td>
                            <td className="p-2 font-bold text-slate-800 truncate max-w-[150px]">{b.title}</td>
                            <td className="p-2"><span className="px-1.5 py-0.5 rounded-sm bg-slate-100 border text-slate-600 font-semibold">{b.category}</span></td>
                            <td className="p-2 text-slate-500 font-bold">{b.priority}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeImportTab === "kpis" && (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                        <th className="p-2">{language === "vi" ? "Tháng" : "Month"}</th>
                        <th className="p-2">Leads</th>
                        <th className="p-2">MQLs</th>
                        <th className="p-2">Web Actions</th>
                        <th className="p-2">Email Contacts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {importPreview.kpis.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-semibold">{language === "vi" ? "Không tìm thấy bản ghi nào trên sheet KPI Actuals" : "No records found on KPI Actuals sheet"}</td>
                        </tr>
                      ) : (
                        importPreview.kpis.map((k, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-slate-800 font-bold font-mono">{k.monthKey}</td>
                            <td className="p-2 text-slate-600 font-semibold">{k.leadsActual}</td>
                            <td className="p-2 text-slate-600 font-semibold">{k.mqlsActual}</td>
                            <td className="p-2 text-slate-600 font-semibold">{k.webConvActual}</td>
                            <td className="p-2 text-slate-600 font-semibold">{k.emailContactsActual}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {importPreview && (
          <div className="pt-4 border-t border-slate-200/50 flex items-center justify-between gap-3 bg-white/20 text-xs">
            <span className="text-slate-400 font-medium">{language === "vi" ? "Xem xét cẩn thận trước khi đồng bộ nạp đè dữ liệu cục bộ của bạn" : "Please review details carefully before importing over local data"}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setImportPreview(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-all cursor-pointer"
              >
                {language === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                onClick={handleApplyImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> {language === "vi" ? "Đồng ý Nhập dữ liệu" : "Confirm Import"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
