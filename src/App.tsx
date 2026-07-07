import { useState, useEffect } from "react";
import { useThemeLanguage } from "./lib/ThemeLanguageContext";
import { COLOR_VALUES } from "./lib/translations";
import { 
  db, 
  auth, 
  signInWithGoogle, 
  logoutUser, 
  getGoogleRedirectResult,
  OperationType, 
  handleFirestoreError 
} from "./lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs 
} from "firebase/firestore";
import { 
  WorklogTask, 
  BacklogTask, 
  MonthlyKpiActuals, 
  TaskCategory, 
  TaskStatus, 
  TaskPriority,
  CATEGORY_STANDARDS,
  DEFAULT_KPI_TARGETS
} from "./types";
import { 
  SEED_WORKLOG_TASKS, 
  SEED_BACKLOG_TASKS, 
  SEED_KPI_ACTUALS 
} from "./data";
import { KpiSummaryCards } from "./components/KpiSummaryCards";
import { WorklogTable } from "./components/WorklogTable";
import { GanttChart } from "./components/GanttChart";
import { BacklogView } from "./components/BacklogView";
import { AiCoachView } from "./components/AiCoachView";
import SheetsSyncView from "./components/SheetsSyncView";
import { SettingsModal } from "./components/SettingsModal";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileSpreadsheet, 
  ClipboardList, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  RotateCcw,
  BookOpen,
  PieChart as PieIcon,
  CheckCircle,
  X,
  Cloud,
  LogIn,
  LogOut,
  Settings
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";

export default function App() {
  const { t, language, themeColor } = useThemeLanguage();
  const activeThemeHex = COLOR_VALUES[themeColor] || "#34A7B2";

  // 1. Initial State Loading from LocalStorage with fallback to seed data
  const [tasks, setTasks] = useState<WorklogTask[]>(() => {
    const saved = localStorage.getItem("marketing_worklog_tasks");
    return saved ? JSON.parse(saved) : SEED_WORKLOG_TASKS;
  });

  const [backlogTasks, setBacklogTasks] = useState<BacklogTask[]>(() => {
    const saved = localStorage.getItem("marketing_backlog_tasks");
    return saved ? JSON.parse(saved) : SEED_BACKLOG_TASKS;
  });

  const [kpiActuals, setKpiActuals] = useState<MonthlyKpiActuals[]>(() => {
    const saved = localStorage.getItem("marketing_kpi_actuals");
    return saved ? JSON.parse(saved) : SEED_KPI_ACTUALS;
  });

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle Google sign-in with visible error feedback
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
      // If popup succeeded, auth state listener will update `user`.
      // If redirect was initiated, page will reload — nothing more to do here.
    } catch (err: any) {
      setAuthError(err?.message || "Google sign-in failed. Please try again.");
    }
  };

  // Current month: defaults to July 2026
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");
  const [currentTab, setCurrentTab] = useState<"worklog" | "backlog" | "analytics" | "ai_coach" | "sheets">("worklog");
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Google Sheets import handlers
  const handleImportTasks = async (newTasks: WorklogTask[]) => {
    if (user) {
      try {
        for (const tData of newTasks) {
          await setDoc(doc(db, `users/${user.uid}/tasks`, tData.id), tData);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/tasks`);
      }
    } else {
      setTasks(newTasks);
    }
  };

  const handleImportBacklogs = async (newBacklogs: BacklogTask[]) => {
    if (user) {
      try {
        for (const b of newBacklogs) {
          await setDoc(doc(db, `users/${user.uid}/backlogTasks`, b.id), b);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/backlogTasks`);
      }
    } else {
      setBacklogTasks(newBacklogs);
    }
  };

  const handleImportKpis = async (newKpiActuals: MonthlyKpiActuals[]) => {
    if (user) {
      try {
        for (const k of newKpiActuals) {
          await setDoc(doc(db, `users/${user.uid}/kpiActuals`, k.monthKey), k);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/kpiActuals`);
      }
    } else {
      setKpiActuals(newKpiActuals);
    }
  };

  // 2. State Persistence for Local Guest Mode
  useEffect(() => {
    if (!user) {
      localStorage.setItem("marketing_worklog_tasks", JSON.stringify(tasks));
    }
  }, [tasks, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("marketing_backlog_tasks", JSON.stringify(backlogTasks));
    }
  }, [backlogTasks, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("marketing_kpi_actuals", JSON.stringify(kpiActuals));
    }
  }, [kpiActuals, user]);

  // Auth & Sync Subscription Management
  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(collection(db, `users/${user.uid}/tasks`), (snapshot) => {
      const loaded: WorklogTask[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as WorklogTask);
      });
      if (loaded.length > 0) {
        setTasks(loaded);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/tasks`);
    });

    const unsubBacklogs = onSnapshot(collection(db, `users/${user.uid}/backlogTasks`), (snapshot) => {
      const loaded: BacklogTask[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as BacklogTask);
      });
      if (loaded.length > 0) {
        setBacklogTasks(loaded);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/backlogTasks`);
    });

    const unsubKpis = onSnapshot(collection(db, `users/${user.uid}/kpiActuals`), (snapshot) => {
      const loaded: MonthlyKpiActuals[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as MonthlyKpiActuals);
      });
      if (loaded.length > 0) {
        setKpiActuals(loaded);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/kpiActuals`);
    });

    return () => {
      unsubTasks();
      unsubBacklogs();
      unsubKpis();
    };
  }, [user]);

  // Handle Auth state change
  useEffect(() => {
    // Handle any pending redirect result first
    getGoogleRedirectResult()
      .then((redirectResult) => {
        if (redirectResult) {
          // Access token is cached inside firebase.ts automatically.
          // Auth state listener below will pick up the user.
          console.log("Redirect sign-in completed for:", redirectResult.user.email);
        }
      })
      .catch((err: any) => {
        setAuthError(err?.message || "Google sign-in redirect failed.");
      });

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      
      if (currentUser) {
        try {
          const tasksColRef = collection(db, `users/${currentUser.uid}/tasks`);
          const snap = await getDocs(tasksColRef);
          if (snap.empty) {
            // Seed Firestore database on first login with user's current local state
            const localTasksSaved = localStorage.getItem("marketing_worklog_tasks");
            const localTasks = localTasksSaved ? JSON.parse(localTasksSaved) : SEED_WORKLOG_TASKS;
            for (const tData of localTasks) {
              await setDoc(doc(db, `users/${currentUser.uid}/tasks`, tData.id), tData);
            }

            const localBacklogsSaved = localStorage.getItem("marketing_backlog_tasks");
            const localBacklogs = localBacklogsSaved ? JSON.parse(localBacklogsSaved) : SEED_BACKLOG_TASKS;
            for (const b of localBacklogs) {
              await setDoc(doc(db, `users/${currentUser.uid}/backlogTasks`, b.id), b);
            }

            const localKpisSaved = localStorage.getItem("marketing_kpi_actuals");
            const localKpis = localKpisSaved ? JSON.parse(localKpisSaved) : SEED_KPI_ACTUALS;
            for (const k of localKpis) {
              await setDoc(doc(db, `users/${currentUser.uid}/kpiActuals`, k.monthKey), k);
            }
          }
        } catch (err) {
          console.error("Error seeding initial Firestore user collections:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to get active month actuals or fallback to empty actuals
  const getActiveActuals = (): MonthlyKpiActuals => {
    const found = kpiActuals.find((a) => a.monthKey === selectedMonth);
    if (found) return found;
    return {
      monthKey: selectedMonth,
      leadsActual: 0,
      mqlsActual: 0,
      webConvActual: 0,
      emailContactsActual: 0,
    };
  };

  const handleUpdateActuals = async (updated: Partial<MonthlyKpiActuals>) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/kpiActuals`, selectedMonth);
      const active = getActiveActuals();
      const nextActuals = {
        monthKey: selectedMonth,
        leadsActual: active.leadsActual,
        mqlsActual: active.mqlsActual,
        webConvActual: active.webConvActual,
        emailContactsActual: active.emailContactsActual,
        ...updated
      };
      try {
        await setDoc(docRef, nextActuals);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/kpiActuals/${selectedMonth}`);
      }
    } else {
      setKpiActuals((prev) => {
        const idx = prev.findIndex((a) => a.monthKey === selectedMonth);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next;
        } else {
          return [
            ...prev,
            {
              monthKey: selectedMonth,
              leadsActual: 0,
              mqlsActual: 0,
              webConvActual: 0,
              emailContactsActual: 0,
              ...updated,
            },
          ];
        }
      });
    }
  };

  // 3. Handlers
  const handleAddTask = async (newTask: Omit<WorklogTask, "id">) => {
    const id = `task-${Date.now()}`;
    if (user) {
      const docRef = doc(db, `users/${user.uid}/tasks`, id);
      try {
        await setDoc(docRef, { id, ...newTask });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tasks/${id}`);
      }
    } else {
      setTasks((prev) => [...prev, { id, ...newTask }]);
    }
  };

  const handleUpdateTask = async (id: string, updated: Partial<WorklogTask>) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/tasks`, id);
      try {
        await updateDoc(docRef, updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tasks/${id}`);
      }
    } else {
      setTasks((prev) =>
        prev.map((tData) => (tData.id === id ? { ...tData, ...updated } : tData))
      );
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm(t("deleteTaskConfirm"))) {
      if (user) {
        const docRef = doc(db, `users/${user.uid}/tasks`, id);
        try {
          await deleteDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/tasks/${id}`);
        }
      } else {
        setTasks((prev) => prev.filter((tData) => tData.id !== id));
      }
    }
  };

  const handleAddBacklogTask = async (newBacklog: Omit<BacklogTask, "id" | "createdAt">) => {
    const id = `backlog-${Date.now()}`;
    const today = new Date();
    const createdAt = today.toISOString().split("T")[0];
    const taskData = { id, createdAt, ...newBacklog };
    if (user) {
      const docRef = doc(db, `users/${user.uid}/backlogTasks`, id);
      try {
        await setDoc(docRef, taskData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/backlogTasks/${id}`);
      }
    } else {
      setBacklogTasks((prev) => [...prev, taskData]);
    }
  };

  const handleDeleteBacklogTask = async (id: string) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/backlogTasks`, id);
      try {
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/backlogTasks/${id}`);
      }
    } else {
      setBacklogTasks((prev) => prev.filter((tData) => tData.id !== id));
    }
  };

  const handleMoveToWorklog = async (backlogTask: BacklogTask, targetMonth?: string) => {
    const today = new Date();
    const monthToUse = targetMonth || selectedMonth;
    const [yearVal, monthVal] = monthToUse.split("-");
    const dayVal = String(today.getDate()).padStart(2, "0");
    const taskDate = `${yearVal}-${monthVal}-${dayVal}`;

    const newTask: Omit<WorklogTask, "id"> = {
      date: taskDate,
      title: backlogTask.title,
      category: backlogTask.category,
      status: TaskStatus.TO_DO,
      priority: backlogTask.priority,
      isCaseStudyOrInsight: false,
      kpiImpact: "None",
      notes: backlogTask.notes || t("backlogNotesFallback"),
    };

    const newTaskId = `task-${Date.now()}`;

    if (user) {
      const backlogDocRef = doc(db, `users/${user.uid}/backlogTasks`, backlogTask.id);
      const taskDocRef = doc(db, `users/${user.uid}/tasks`, newTaskId);
      try {
        await deleteDoc(backlogDocRef);
        await setDoc(taskDocRef, { id: newTaskId, ...newTask });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tasks/${newTaskId}`);
      }
    } else {
      setBacklogTasks((prev) => prev.filter((tData) => tData.id !== backlogTask.id));
      setTasks((prev) => [...prev, { id: newTaskId, ...newTask }]);
    }
  };

  const handleResetData = async () => {
    if (confirm(t("resetConfirm"))) {
      if (user) {
        try {
          const tasksCol = collection(db, `users/${user.uid}/tasks`);
          const tasksSnap = await getDocs(tasksCol);
          for (const d of tasksSnap.docs) {
            await deleteDoc(doc(db, `users/${user.uid}/tasks`, d.id));
          }

          const backlogsCol = collection(db, `users/${user.uid}/backlogTasks`);
          const backlogsSnap = await getDocs(backlogsCol);
          for (const d of backlogsSnap.docs) {
            await deleteDoc(doc(db, `users/${user.uid}/backlogTasks`, d.id));
          }

          const kpisCol = collection(db, `users/${user.uid}/kpiActuals`);
          const kpisSnap = await getDocs(kpisCol);
          for (const d of kpisSnap.docs) {
            await deleteDoc(doc(db, `users/${user.uid}/kpiActuals`, d.id));
          }

          for (const tData of SEED_WORKLOG_TASKS) {
            await setDoc(doc(db, `users/${user.uid}/tasks`, tData.id), tData);
          }
          for (const b of SEED_BACKLOG_TASKS) {
            await setDoc(doc(db, `users/${user.uid}/backlogTasks`, b.id), b);
          }
          for (const k of SEED_KPI_ACTUALS) {
            await setDoc(doc(db, `users/${user.uid}/kpiActuals`, k.monthKey), k);
          }
        } catch (error) {
          console.error("Error resetting Cloud database:", error);
        }
      } else {
        localStorage.removeItem("marketing_worklog_tasks");
        localStorage.removeItem("marketing_backlog_tasks");
        localStorage.removeItem("marketing_kpi_actuals");
        setTasks(SEED_WORKLOG_TASKS);
        setBacklogTasks(SEED_BACKLOG_TASKS);
        setKpiActuals(SEED_KPI_ACTUALS);
      }
      setSelectedMonth("2026-07");
    }
  };

  // Month navigation
  const adjustMonth = (direction: number) => {
    const [yearStrVal, monthStrVal] = selectedMonth.split("-");
    const yearVal = parseInt(yearStrVal);
    const monthVal = parseInt(monthStrVal);

    let nextMonth = monthVal + direction;
    let nextYear = yearVal;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    setSelectedMonth(nextMonthKey);
  };

  const [yearStrVal, monthStrVal] = selectedMonth.split("-");
  const monthDisplayLabel = t("monthLabel", { month: monthStrVal, year: yearStrVal });

  // 4. Analytics Data Preparation
  const monthlyTasks = tasks.filter((tData) => tData.date.substring(0, 7) === selectedMonth);
  const activeActuals = getActiveActuals();

  // Category chart data
  const categoryCounts = monthlyTasks.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.keys(CATEGORY_STANDARDS).map((catKey) => {
    const cat = catKey as TaskCategory;
    return {
      name: cat,
      value: categoryCounts[cat] || 0,
      color: getCategoryColor(cat),
    };
  }).filter((d) => d.value > 0);

  function getCategoryColor(cat: TaskCategory) {
    if (cat === TaskCategory.CONTENT_MARKETING) return "#10b981"; // emerald
    if (cat === TaskCategory.PRODUCT_MARKETING) return "#3b82f6"; // blue
    if (cat === TaskCategory.DEMAND_GENERATION) return "#f97316"; // orange
    if (cat === TaskCategory.SALES_ENABLEMENT) return "#8b5cf6"; // violet
    if (cat === TaskCategory.CUSTOMER_MARKETING) return "#f43f5e"; // rose
    if (cat === TaskCategory.WEBSITE_CRO) return "#14b8a6"; // teal
    if (cat === TaskCategory.MARKET_RESEARCH) return "#6366f1"; // indigo
    if (cat === TaskCategory.ANALYTICS_REPORTING) return "#f59e0b"; // amber
    if (cat === TaskCategory.CAMPAIGN_MANAGEMENT) return "#06b6d4"; // cyan
    return "#64748b"; // slate
  }

  // Execution KPIs Progress
  const completedTasks = monthlyTasks.filter((tData) => tData.status === TaskStatus.DONE);
  const socialPostsDone = completedTasks.filter(
    (tData) => tData.category === TaskCategory.CONTENT_MARKETING || tData.kpiImpact === "Social Content"
  ).length;
  const emailCampaignsDone = completedTasks.filter(
    (tData) => tData.category === TaskCategory.CAMPAIGN_MANAGEMENT || tData.kpiImpact === "Email Campaign"
  ).length;
  const salesAssetsDone = completedTasks.filter(
    (tData) => tData.category === TaskCategory.SALES_ENABLEMENT || tData.category === TaskCategory.CUSTOMER_MARKETING || tData.kpiImpact === "Sales Asset / Case Study"
  ).length;

  const executionChartData = [
    {
      name: language === "vi" ? "Social Posts" : "Social Posts",
      [language === "vi" ? "Thực tế" : "Actual"]: socialPostsDone,
      [language === "vi" ? "Chỉ tiêu tối thiểu" : "Min Target"]: DEFAULT_KPI_TARGETS.socialContentMin,
    },
    {
      name: language === "vi" ? "Email Campaigns" : "Email Campaigns",
      [language === "vi" ? "Thực tế" : "Actual"]: emailCampaignsDone,
      [language === "vi" ? "Chỉ tiêu tối thiểu" : "Min Target"]: DEFAULT_KPI_TARGETS.emailCampaignsMin,
    },
    {
      name: language === "vi" ? "Sales Assets" : "Sales Assets",
      [language === "vi" ? "Thực tế" : "Actual"]: salesAssetsDone,
      [language === "vi" ? "Chỉ tiêu tối thiểu" : "Min Target"]: DEFAULT_KPI_TARGETS.salesAssetsMin,
    }
  ];

  // Conversion KPIs Progress
  const conversionChartData = [
    {
      name: "Leads",
      [language === "vi" ? "Thực tế" : "Actual"]: activeActuals.leadsActual,
      [language === "vi" ? "Chỉ tiêu" : "Target"]: DEFAULT_KPI_TARGETS.leadsMin,
    },
    {
      name: "MQLs",
      [language === "vi" ? "Thực tế" : "Actual"]: activeActuals.mqlsActual,
      [language === "vi" ? "Chỉ tiêu" : "Target"]: DEFAULT_KPI_TARGETS.mqlsMin,
    },
    {
      name: "Web Actions",
      [language === "vi" ? "Thực tế" : "Actual"]: activeActuals.webConvActual,
      [language === "vi" ? "Chỉ tiêu" : "Target"]: DEFAULT_KPI_TARGETS.webConvMin,
    },
    {
      name: "New Emails",
      [language === "vi" ? "Thực tế" : "Actual"]: activeActuals.emailContactsActual,
      [language === "vi" ? "Chỉ tiêu" : "Target"]: DEFAULT_KPI_TARGETS.emailContactsMin,
    }
  ];

  return (
    <div className="min-h-screen text-stone-800 flex flex-col">
      
      {/* HEADER SECTION */}
      <header style={{ background: "linear-gradient(135deg, #1A0F05 0%, #2C1A08 100%)", borderBottom: "1px solid rgba(251,191,36,0.12)" }} className="sticky top-0 z-40 text-white shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand/Title */}
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: activeThemeHex }}
              className="w-10 h-10 rounded-xl text-white shadow-md flex items-center justify-center font-bold text-lg transition-colors duration-300"
            >
              W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white font-display">{t("brandName")}</h1>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono" style={{ background: "rgba(41,22,4,0.70)", border: "1px solid rgba(180,83,9,0.40)", color: "rgba(253,230,138,0.80)" }}>
                  {t("activeLabel")}
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(253,211,77,0.55)" }}>{t("brandSubtitle")}</p>
            </div>
          </div>

          {/* Month Swapping Control */}
          <div className="flex items-center gap-1 p-1 rounded-xl shadow-inner backdrop-blur-xs" style={{ background: "rgba(41,22,4,0.80)", border: "1px solid rgba(180,83,9,0.45)" }}>
            <button 
              onClick={() => adjustMonth(-1)}
              className="p-1.5 rounded-lg transition-all cursor-pointer"
              style={{ color: "rgba(253,230,138,0.75)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(60,32,6,0.70)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
              title={t("prevMonth")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-3 text-xs font-bold font-mono text-center min-w-[110px] uppercase tracking-wider" style={{ color: "rgba(253,230,138,0.95)" }}>
              {monthDisplayLabel}
            </div>

            <button 
              onClick={() => adjustMonth(1)}
              className="p-1.5 rounded-lg transition-all cursor-pointer"
              style={{ color: "rgba(253,230,138,0.75)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(60,32,6,0.70)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
              title={t("nextMonth")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                }
              }}
              className="ml-1.5 py-1 px-2.5 rounded-lg text-xs font-mono focus:outline-hidden cursor-pointer [color-scheme:dark]"
              style={{ background: "#0f0800", border: "1px solid rgba(180,83,9,0.50)", color: "rgba(253,230,138,0.85)" }}
            />
          </div>

          {/* Core Controls & Cloud Auth Sync */}
          <div className="flex items-center gap-2.5">
            {/* Sync State Indicator */}
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-950/40 text-emerald-400 px-3 py-1.5 rounded-lg flex gap-1.5 items-center text-xs border border-emerald-500/20 font-medium shadow-sm font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"></span>
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px] tracking-wide">{t("cloudSync")}</span>
                </div>
                
                {/* User avatar card */}
                <div className="flex items-center gap-2 p-1 pl-2.5 rounded-xl text-xs" style={{ background: "rgba(41,22,4,0.80)", border: "1px solid rgba(180,83,9,0.40)" }}>
                  <span className="max-w-[90px] truncate font-medium" style={{ color: "rgba(253,230,138,0.85)" }}>{user.displayName || "User"}</span>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || "User Avatar"} 
                      className="w-6 h-6 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center text-[10px] font-bold uppercase text-white">
                      {(user.displayName || "U").substring(0, 2)}
                    </div>
                  )}
                  <button
                    onClick={logoutUser}
                    className="p-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ color: "rgba(253,211,77,0.50)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(60,32,6,0.60)"; e.currentTarget.style.color = "#fca5a5"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "rgba(253,211,77,0.50)"; }}
                    title={t("logout")}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg flex gap-1.5 items-center text-[10px] font-bold font-mono" style={{ background: "rgba(41,22,4,0.70)", border: "1px solid rgba(180,83,9,0.35)", color: "rgba(253,211,77,0.55)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(253,211,77,0.40)" }}></span>
                  {t("localOnly")}
                </div>
                
                <button
                  onClick={handleSignIn}
                  disabled={loadingAuth}
                  className="bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                  style={{ boxShadow: "0 4px 14px rgba(245,158,11,0.30)" }}
                  title="Link Firestore database"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{loadingAuth ? t("loading") : t("loginToSync")}</span>
                </button>
              </div>
            )}

            <div className="w-px h-6 hidden sm:block" style={{ background: "rgba(180,83,9,0.30)" }}></div>

            {/* Custom Settings button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg transition-all cursor-pointer"
              style={{ color: "rgba(253,211,77,0.55)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(60,32,6,0.60)"; e.currentTarget.style.color = "rgba(255,255,255,0.90)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "rgba(253,211,77,0.55)"; }}
              title={t("settingsTitle")}
            >
              <Settings className="w-4 h-4 animate-spin-slow" />
            </button>

            <button
              onClick={() => setShowGlossary(true)}
              className="p-2 rounded-lg transition-all cursor-pointer"
              style={{ color: "rgba(253,211,77,0.55)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(60,32,6,0.60)"; e.currentTarget.style.color = "rgba(255,255,255,0.90)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "rgba(253,211,77,0.55)"; }}
              title={t("viewGlossary")}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetData}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ background: "rgba(41,22,4,0.70)", border: "1px solid rgba(180,83,9,0.40)", color: "rgba(253,230,138,0.75)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(60,32,6,0.80)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(41,22,4,0.70)")}
              title="Reset Database"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t("resetData")}
            </button>
          </div>

        </div>

        {/* NAVIGATION TABS BAR */}
        <div style={{ background: "#fef9ee", borderBottom: "1px solid rgba(217,119,6,0.18)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-6 text-xs font-bold uppercase tracking-wider font-mono">
              <button
                onClick={() => setCurrentTab("worklog")}
                className={`py-3.5 border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === "worklog" 
                    ? "border-amber-600 text-amber-700 font-bold" 
                    : "border-transparent hover:text-amber-800"
                }`}
                style={currentTab !== "worklog" ? { color: "#9a7a3a" } : {}}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t("tabWorklog")}</span>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-bold border border-amber-100">
                  {t("tasksCount", { count: monthlyTasks.length })}
                </span>
              </button>

              <button
                onClick={() => setCurrentTab("backlog")}
                className={`py-3.5 border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === "backlog" 
                    ? "border-amber-600 text-amber-700 font-bold" 
                    : "border-transparent hover:text-amber-800"
                }`}
                style={currentTab !== "backlog" ? { color: "#9a7a3a" } : {}}
              >
                <ClipboardList className="w-4 h-4" />
                <span>{t("tabBacklog")}</span>
                <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md font-bold">
                  {t("ideasCount", { count: backlogTasks.length })}
                </span>
              </button>

              <button
                onClick={() => setCurrentTab("analytics")}
                className={`py-3.5 border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === "analytics" 
                    ? "border-amber-600 text-amber-700 font-bold" 
                    : "border-transparent hover:text-amber-800"
                }`}
                style={currentTab !== "analytics" ? { color: "#9a7a3a" } : {}}
              >
                <PieIcon className="w-4 h-4" />
                <span>{t("tabAnalytics")}</span>
              </button>

              <button
                onClick={() => setCurrentTab("ai_coach")}
                className={`py-3.5 border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === "ai_coach" 
                    ? "border-amber-600 text-amber-700 font-bold" 
                    : "border-transparent hover:text-amber-800"
                }`}
                style={currentTab !== "ai_coach" ? { color: "#9a7a3a" } : {}}
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>{t("tabAiCoach")}</span>
              </button>

              <button
                onClick={() => setCurrentTab("sheets")}
                className={`py-3.5 border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === "sheets" 
                    ? "border-amber-600 text-amber-700 font-bold" 
                    : "border-transparent hover:text-amber-800"
                }`}
                style={currentTab !== "sheets" ? { color: "#9a7a3a" } : {}}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{t("tabSheets")}</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold">
                  {t("sheetsCount")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AUTH ERROR BANNER */}
      {authError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <div className="shrink-0 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">!</div>
            <div className="flex-1 text-sm text-rose-800 font-medium">
              <strong className="font-bold">Sign-in failed:</strong> {authError}
              <p className="text-xs text-rose-600 mt-0.5 font-normal">
                If popups are blocked, allow popups for this site in your browser. Also confirm <strong>localhost</strong> is listed in your Firebase Console → Authentication → Authorized Domains.
              </p>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="shrink-0 p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-all cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CORE BODY WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ACTIVE WORKLOG & DYNAMIC KPIs */}
          {currentTab === "worklog" && (
            <motion.div
              key="worklog"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* KPIs Header Cards */}
              <KpiSummaryCards 
                tasks={monthlyTasks}
                actuals={activeActuals}
                onUpdateActuals={handleUpdateActuals}
              />

              {/* Main Sheets Workspace */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-slate-500 rounded-full inline-block"></span>
                    {t("tableTitle")} ({monthDisplayLabel})
                  </h3>
                  
                  <span className="text-xs text-slate-400 font-medium">
                    {language === "vi" ? `Đang hiển thị ${monthlyTasks.length} hàng công việc` : `Showing ${monthlyTasks.length} task entries`}
                  </span>
                </div>

                <WorklogTable 
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  selectedMonth={selectedMonth}
                />
              </div>

              {/* Gantt Chart at the bottom */}
              <GanttChart tasks={tasks} selectedMonth={selectedMonth} />
            </motion.div>
          )}

          {/* TAB 2: BACKLOG SYSTEM */}
          {currentTab === "backlog" && (
            <motion.div
              key="backlog"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <BacklogView 
                backlogTasks={backlogTasks}
                onAddBacklogTask={handleAddBacklogTask}
                onDeleteBacklogTask={handleDeleteBacklogTask}
                onMoveToWorklog={handleMoveToWorklog}
                selectedMonth={selectedMonth}
              />
            </motion.div>
          )}

          {/* TAB 3: VISUAL CHARTS (RECHARTS) */}
          {currentTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Visual reports overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Chart A: Category Task Split */}
                <div className="glass-panel border border-slate-200/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between bg-white/40 border-white/60">
                  <div>
                    <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 font-display">
                      <PieIcon className="w-5 h-5 text-indigo-600" />
                      {language === "vi" ? `Phân bổ Danh mục Tiếp thị (${monthDisplayLabel})` : `Marketing Category Breakdown (${monthDisplayLabel})`}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5 font-medium">
                      {language === "vi" ? "Kiểm tra sự cân bằng của các hoạt động Growth & Product Marketing thực tế trong tháng." : "Verify alignment of strategic growth marketing categories during the active month."}
                    </p>
                  </div>

                  <div className="h-64 my-4 flex items-center justify-center relative">
                    {categoryChartData.length === 0 ? (
                      <p className="text-slate-400 text-xs font-semibold">{language === "vi" ? "Chưa có dữ liệu task hoàn thành cho tháng này." : "No completed tasks recorded this month."}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: any) => [`${value} tasks`, name]} 
                            contentStyle={{ borderRadius: "12px", border: "1px solid rgba(226,232,240,0.8)", backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Legend breakdown table */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs pt-4 border-t border-slate-200/50">
                    {categoryChartData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                        <span className="truncate font-semibold">{entry.name}:</span>
                        <span className="font-mono font-bold text-slate-800 ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart B: Execution Progress vs Targets */}
                <div className="glass-panel border border-slate-200/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between bg-white/40 border-white/60">
                  <div>
                    <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 font-display">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      {language === "vi" ? "Tiến độ Thực thi (Execution KPIs) vs Chỉ tiêu tối thiểu" : "Execution Deliverables vs Minimum Targets"}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5 font-medium">
                      {language === "vi" ? "So sánh số lượng đầu việc đã hoàn thành so với mục tiêu tối thiểu định trước của tháng." : "Compare completed deliverables against target KPIs set for the month."}
                    </p>
                  </div>

                  <div className="h-64 my-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={executionChartData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid rgba(226,232,240,0.8)", backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)" }} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey={language === "vi" ? "Thực tế" : "Actual"} fill={activeThemeHex} radius={[4, 4, 0, 0]} />
                        <Bar dataKey={language === "vi" ? "Chỉ tiêu tối thiểu" : "Min Target"} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-100/50 rounded-xl text-xs text-indigo-700 flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>{language === "vi" ? "Hệ thống tự động liên kết các task có trạng thái \"Done\" có Category Standard tương ứng để cập nhật biểu đồ thực tế." : "The chart automatically aggregates tasks set to 'Done' matching designated category configurations."}</span>
                  </div>
                </div>

              </div>

              {/* Chart C: Conversion Progress vs Targets */}
              <div className="glass-panel border border-slate-200/60 rounded-2xl p-5 shadow-xs bg-white/40 border-white/60">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 font-display">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    {t("kpisSectionTitle")}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">
                    {t("kpisSectionSubtitle")}
                  </p>
                </div>

                <div className="h-80 my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid rgba(226,232,240,0.8)", backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)" }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey={language === "vi" ? "Thực tế" : "Actual"} fill={activeThemeHex} radius={[4, 4, 0, 0]} />
                      <Bar dataKey={language === "vi" ? "Chỉ tiêu" : "Target"} fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4: GEMINI AI ADVISOR */}
          {currentTab === "ai_coach" && (
            <motion.div
              key="ai_coach"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <AiCoachView 
                tasks={tasks}
                actuals={activeActuals}
                backlogTasks={backlogTasks}
                selectedMonth={selectedMonth}
              />
            </motion.div>
          )}

          {/* TAB 5: GOOGLE SHEETS INTEGRATION */}
          {currentTab === "sheets" && (
            <motion.div
              key="sheets"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <SheetsSyncView 
                tasks={tasks}
                backlogTasks={backlogTasks}
                kpiActuals={kpiActuals}
                selectedMonth={selectedMonth}
                onImportTasks={handleImportTasks}
                onImportBacklogs={handleImportBacklogs}
                onImportKpis={handleImportKpis}
              />
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* STANDARD CATEGORIES GLOSSARY SLIDE OVER/MODAL */}
      <AnimatePresence>
        {showGlossary && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex justify-end">
            
            {/* Modal overlay background */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGlossary(false)}
              className="absolute inset-0"
            />

            {/* Modal content side sheet */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white/95 backdrop-blur-lg border-l border-white/20 w-full max-w-lg h-full shadow-2xl relative z-10 flex flex-col justify-between"
            >
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-slate-900 font-extrabold text-base font-display">{t("glossaryTitle")}</h3>
                  </div>
                  <button 
                    onClick={() => setShowGlossary(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {language === "vi" 
                    ? "Đối với một Growth & Product Marketer, việc phân bổ công việc theo các danh mục chuẩn (Standard Categories) giúp tối ưu hóa phễu chuyển đổi toàn diện, tránh việc quá tập trung vào thực thi (content) mà quên đi tối ưu trải nghiệm trang (CRO) hay hỗ trợ đội ngũ kinh doanh (Sales Enablement)."
                    : "For Growth & Product Marketers, assigning deliverables into standard categories helps audit resources across the full funnel. This maintains balance between active production and CRO or sales enablement support."}
                </p>

                {/* Categories List */}
                <div className="space-y-4">
                  {Object.values(CATEGORY_STANDARDS).map((info, idx) => (
                    <div key={idx} className="border border-slate-200/80 bg-white/60 rounded-xl p-4 space-y-1.5 hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.bgColor} ${info.color}`}>
                          {info.category}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">
                          KPI: {info.relatedKpi}
                        </span>
                      </div>
                      <p className="text-slate-800 text-xs font-bold">{info.purpose}</p>
                    </div>
                  ))}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setShowGlossary(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  {t("glossaryClose")}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC SETTINGS MODAL */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* DYNAMIC FOOTER BAR */}
      <footer className="bg-white/40 border-t border-slate-200/60 py-6 text-center text-xs text-slate-400 mt-auto select-none font-medium backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Worklog Plan & KPI Tracker. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Auto-save Active
            </span>
            <span>•</span>
            <span className="font-mono text-[9px] font-bold">React 19 + Tailwind v4 + Gemini 3.5</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
