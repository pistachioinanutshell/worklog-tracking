export enum TaskCategory {
  CONTENT_MARKETING = "Content Marketing",
  PRODUCT_MARKETING = "Product Marketing",
  DEMAND_GENERATION = "Demand Generation",
  SALES_ENABLEMENT = "Sales Enablement",
  CUSTOMER_MARKETING = "Customer Marketing",
  WEBSITE_CRO = "Website & CRO",
  MARKET_RESEARCH = "Market Research",
  ANALYTICS_REPORTING = "Analytics & Reporting",
  CAMPAIGN_MANAGEMENT = "Campaign Management",
  OPERATIONS = "Operations",
}

export interface CategoryInfo {
  category: TaskCategory;
  purpose: string;
  relatedKpi: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const CATEGORY_STANDARDS: Record<TaskCategory, CategoryInfo> = {
  [TaskCategory.CONTENT_MARKETING]: {
    category: TaskCategory.CONTENT_MARKETING,
    purpose: "Tạo content phục vụ awareness, SEO, social",
    relatedKpi: "12-15 posts/tháng",
    color: "text-emerald-700",
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50",
  },
  [TaskCategory.PRODUCT_MARKETING]: {
    category: TaskCategory.PRODUCT_MARKETING,
    purpose: "Positioning, Messaging, USP, Launch, Product Brief",
    relatedKpi: "Sales Asset + Case Study",
    color: "text-blue-700",
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
  },
  [TaskCategory.DEMAND_GENERATION]: {
    category: TaskCategory.DEMAND_GENERATION,
    purpose: "Lead generation, Email, Landing Page, CTA",
    relatedKpi: "Leads, MQL, Website Conversion",
    color: "text-orange-700",
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
  },
  [TaskCategory.SALES_ENABLEMENT]: {
    category: TaskCategory.SALES_ENABLEMENT,
    purpose: "Tài liệu hỗ trợ Sales",
    relatedKpi: "2 Sales Assets",
    color: "text-violet-700",
    borderColor: "border-violet-200",
    bgColor: "bg-violet-50",
  },
  [TaskCategory.CUSTOMER_MARKETING]: {
    category: TaskCategory.CUSTOMER_MARKETING,
    purpose: "Case Study, Customer Story, Upsell, Existing Customer",
    relatedKpi: "Case Study",
    color: "text-rose-700",
    borderColor: "border-rose-200",
    bgColor: "bg-rose-50",
  },
  [TaskCategory.WEBSITE_CRO]: {
    category: TaskCategory.WEBSITE_CRO,
    purpose: "Website, SEO, Conversion Optimization",
    relatedKpi: "Website Conversion",
    color: "text-teal-700",
    borderColor: "border-teal-200",
    bgColor: "bg-teal-50",
  },
  [TaskCategory.MARKET_RESEARCH]: {
    category: TaskCategory.MARKET_RESEARCH,
    purpose: "Competitor, ICP, JTBD, Industry Research",
    relatedKpi: "Foundation",
    color: "text-indigo-700",
    borderColor: "border-indigo-200",
    bgColor: "bg-indigo-50",
  },
  [TaskCategory.ANALYTICS_REPORTING]: {
    category: TaskCategory.ANALYTICS_REPORTING,
    purpose: "Dashboard, KPI Review, Digital Audit",
    relatedKpi: "Monthly Review",
    color: "text-amber-700",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
  },
  [TaskCategory.CAMPAIGN_MANAGEMENT]: {
    category: TaskCategory.CAMPAIGN_MANAGEMENT,
    purpose: "Campaign planning & execution",
    relatedKpi: "Email Campaigns + Lead",
    color: "text-cyan-700",
    borderColor: "border-cyan-200",
    bgColor: "bg-cyan-50",
  },
  [TaskCategory.OPERATIONS]: {
    category: TaskCategory.OPERATIONS,
    purpose: "Internal meeting, planning, admin",
    relatedKpi: "Internal",
    color: "text-slate-700",
    borderColor: "border-slate-200",
    bgColor: "bg-slate-50",
  },
};

export enum TaskStatus {
  TO_DO = "To Do",
  IN_PROGRESS = "In Progress",
  DONE = "Done",
}

export enum TaskPriority {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export interface WorklogTask {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  isCaseStudyOrInsight: boolean; // Specially tracked for social content sub-KPI
  notes?: string;
  duration?: string; // e.g., "4h", "2d"
  deliverableLink?: string; // URL link to deliverables
  // KPI impact link to metrics
  kpiImpact?: "Social Content" | "Email Campaign" | "Sales Asset / Case Study" | "None";
}

export interface BacklogTask {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  notes?: string;
  createdAt: string; // YYYY-MM-DD
}

export interface MonthlyKpiActuals {
  monthKey: string; // YYYY-MM
  // Numeric Conversion Metrics (entered directly by user)
  leadsActual: number;
  mqlsActual: number;
  webConvActual: number;
  emailContactsActual: number;
}

export interface MonthlyKpiTargets {
  socialContentMin: number;
  socialContentMax: number;
  socialCaseStudyMin: number;
  emailCampaignsMin: number;
  salesAssetsMin: number;
  leadsMin: number;
  mqlsMin: number;
  webConvMin: number;
  emailContactsMin: number;
}

export const DEFAULT_KPI_TARGETS: MonthlyKpiTargets = {
  socialContentMin: 12,
  socialContentMax: 15,
  socialCaseStudyMin: 3,
  emailCampaignsMin: 2,
  salesAssetsMin: 2,
  leadsMin: 10,
  mqlsMin: 6,
  webConvMin: 20,
  emailContactsMin: 30,
};
