import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry User-Agent
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_IF_ABSENT",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API endpoint to analyze the worklog using Gemini 3.5 Flash
app.post("/api/analyze-worklog", async (req, res) => {
  try {
    const { month, kpis, worklog, backlog, language = "en" } = req.body;

    if (!month || !kpis || !worklog) {
      return res.status(400).json({ error: "Missing required fields (month, kpis, worklog)" });
    }

    const ai = getAiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    const isEn = language === "en";

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Return a simulated high-quality response if Gemini Key is not set up yet
      // This ensures the application works beautifully in the preview right away!
      const mockResponse = isEn ? `### 🌟 OVERVIEW & EXECUTIVE SUMMARY (${month})
You are maintaining a healthy level of overall campaign execution. Your category breakdown shows balanced distribution between Content Marketing and Demand Generation. However, your actual lead conversion counts show a clear gap from targets, particularly with Conversion Actions on the Website.

---

### 📊 KPI EXECUTION & CONVERSION PERFORMANCE

**1. Funnel Execution:**
*   **Social Content:** You have completed **${worklog.filter((t: any) => t.category === "Content Marketing" && t.status === "Done").length} posts** (Target: 12-15). Ensure you highlight customer insights or case studies (Requirement: >3).
*   **Email Campaigns:** Completed **${worklog.filter((t: any) => t.category === "Campaign Management" && t.status === "Done").length} campaigns** (Target: >= 2). This metric is met.
*   **Sales Assets & Customer Stories:** Completed **${worklog.filter((t: any) => (t.category === "Sales Enablement" || t.category === "Customer Marketing") && t.status === "Done").length} deliverables** (Target: >= 2). Maintain this pace, but aim to draft customer stories based on recent renewals.

**2. Funnel Conversion:**
*   **Leads & MQLs:** Acquired **${kpis.leadsActual || 0} / 10 Leads** (including **${kpis.mqlsActual || 0} / 6 MQLs**). Lead-to-MQL conversion is currently ${(kpis.leadsActual ? Math.round(((kpis.mqlsActual || 0) / kpis.leadsActual) * 100) : 0)}%. Consider refinement in targeting parameters.
*   **Website Conversion Actions:** Achieved **${kpis.webConvActual || 0} / 20 actions**. This is currently your primary bottleneck; traffic is either not converting or your core calls-to-action (CTAs) require optimization.
*   **Email Contacts:** Grown database by **${kpis.emailContactsActual || 0} / 30 contacts**. The email subscriber acquisition is stable, but remember to keep nurturing campaigns regular.

---

### 💡 STRATEGIC RECOMMENDATIONS & ACTIONABLE TACTICS

1.  **Optimize Website & Conversion Rate (CRO):**
    *   Review bounce rates of high-traffic Landing Pages immediately.
    *   A/B test button copies (e.g., change "Sign Up" to "Request a Free Demo" or "Download Playbook") to reduce friction and raise *Website Conversion* actions.
2.  **Repurpose Backlog Tasks:**
    *   You have **${backlog.length} items in your Backlog**. Prioritize moving **Website & CRO** and **Product Marketing** tasks to the active month to address lead conversion leaks.
3.  **Drive Engagement with Case Studies:**
    *   Repurpose existing *Sales Assets* into 3-4 micro-content pieces for LinkedIn and Facebook. This increases your high-value social content without additional writing overhead.

---

### 🚀 RECOMMENDED CAMPAIGN CONCEPTS

*   **Campaign 1 - "The Insight Blueprint":** Send a targeted email to your contact list offering an exclusive PDF framework download, driving traffic back to the site to trigger a key conversion action.
*   **Campaign 2 - "Customer Spotlight Series":** Collaborate with Sales to interview a successful client, drafting a short problem-solution-ROI Case Study. Share on social channels with a link to book a consult.` 
      : `### 🌟 NHẬN XÉT TỔNG QUAN (${month})
Bạn đang vận hành khối lượng công việc ở mức khá tốt. Cơ cấu danh mục công việc có sự tập trung tương đối đồng đều giữa Content Marketing và Demand Gen. Tuy nhiên, hiệu quả chuyển đổi thực tế đang có khoảng cách nhất định với các mục tiêu (KPIs) đã đề ra, đặc biệt là ở nhóm Conversion Actions trên Website.

---

### 📊 PHÂN TÍCH KPI EXECUTION & CONVERSION

**1. Về Execution (Thực thi):**
*   **Content Social:** Bạn đã thực hiện được **${worklog.filter((t: any) => t.category === "Content Marketing" && t.status === "Done").length} bài** (mục tiêu 12-15 bài). Cần chú ý tỷ lệ bài chuyên sâu/insight/case-study (Yêu cầu > 3 bài).
*   **Email Campaigns:** Đã hoàn thành **${worklog.filter((t: any) => t.category === "Campaign Management" && t.status === "Done").length} chiến dịch** (mục tiêu 2 chiến dịch). Hạng mục này đã đạt kỳ vọng.
*   **Sales Assets & Case Studies:** Hoàn thành **${worklog.filter((t: any) => (t.category === "Sales Enablement" || t.category === "Customer Marketing") && t.status === "Done").length} tài liệu** (mục tiêu 2). Cần tập trung viết thêm các Case Study thực tế từ khách hàng hiện tại để củng cố lòng tin.

**2. Về Conversion (Chuyển đổi):**
*   **Leads & MQLs:** Đạt **${kpis.leadsActual || 0}/10 Leads** (trong đó có **${kpis.mqlsActual || 0}/6 MQLs**). Hiệu suất chuyển đổi từ Lead sang MQL đang đạt tỉ lệ khoảng ${(kpis.leadsActual ? Math.round(((kpis.mqlsActual || 0) / kpis.leadsActual) * 100) : 0)}%. Cần lọc chất lượng Lead kỹ hơn ở tầng phễu đầu.
*   **Website Conversion Actions:** Đạt **${kpis.webConvActual || 0}/20 actions**. Đây là phễu yếu nhất hiện nay. Lượng traffic đổ về chưa thực hiện chuyển đổi hoặc UX/CTA trên trang chưa thực sự tối ưu.
*   **Email Contacts:** Đạt **${kpis.emailContactsActual || 0}/30 contacts**. Danh sách liên hệ tăng trưởng ổn định nhưng cần duy trì tần suất nuôi dưỡng (lead nurturing) đều đặn.

---

### 💡 KHUYẾN NGHỊ CHIẾN THUẬT (ACTIONABLE TACTICS)
1.  **Tối ưu hóa Website & CRO:**
    *   Kiểm tra ngay tỷ lệ thoát (bounce rate) của các Landing Page chủ chốt.
    *   Thay đổi vị trí CTA hoặc tiêu đề nút (ví dụ: Thay "Đăng ký ngay" thành "Nhận bản demo miễn phí" hoặc "Tải tài liệu giải pháp") để đẩy nhanh chỉ số *Website Conversion*.
2.  **Chuyển đổi Backlog linh hoạt:**
    *   Bạn đang có **${backlog.length} task trong Backlog**. Hãy ưu tiên kéo các task liên quan đến **Website & CRO** hoặc **Product Marketing** ra thực thi sớm trong tuần tới để tháo gỡ điểm nghẽn chuyển đổi.
3.  **Tăng tốc Social Content & Case Studies:**
    *   Tận dụng nội dung từ các *Sales Asset* hiện có để xắt nhỏ (repurpose) thành 3-4 bài đăng social dạng insight ngắn. Điều này vừa giúp tiết kiệm thời gian viết nội dung mới, vừa nâng cao chất lượng chuyên môn cho kênh social.

---

### 🚀 Ý TƯỞNG CAMPAIGN GỢI Ý (CREATIVE IDEAS)
*   **Campaign 1 - "The Insight Blueprint":** Tổ chức 1 chiến dịch Email Campaign gửi tặng độc quyền bộ slide "Product Brief / Framework" cho tệp Email Contacts hiện tại để thúc đẩy họ truy cập website và thực hiện đăng ký tư vấn chuyên sâu (Conversion Action).
*   **Campaign 2 - "Customer Spotlight Series":** Phối hợp cùng Sales team phỏng vấn nhanh 1 khách hàng đã thành công nhờ sản phẩm, viết thành 1 bài Case Study ngắn dạng "Vấn đề -> Giải pháp -> Kết quả (ROI)", sau đó đăng tải lên LinkedIn và chạy email newsletter tương ứng.`;

      return res.json({ analysis: mockResponse, mocked: true });
    }

    const systemPrompt = isEn ? `You are an elite Growth Marketing & Product Marketing Specialist.
The user provides you with their monthly worklog, backlog of unscheduled tasks, and monthly KPI results (Execution vs Conversion targets) for a specific month.
Your goal is to write a highly professional, actionable, and detailed Growth Marketing audit and advisory report in English.
Use clean Markdown formatting, professional marketing terminology, and structured bullet points.

Adhere to the following report sections:
1. Executive Summary (Overall momentum, main accomplishments, and trends)
2. KPI Execution & Conversion Analysis (Critique specific metrics: Social posts, Email campaigns, Case Studies, Leads/MQLs, Website conversions, Email contacts. Calculate percentages where helpful and highlight bottlenecks)
3. Actionable Tactics (Provide 3-4 concrete tips to optimize current campaigns, repurpose content, or prioritize backlog items)
4. Creative Campaign & Content Ideas (Provide 2 highly creative, realistic, and tailored campaign or content ideas for this marketer to try)

Ensure you address the specific category standards in their logs: Content Marketing, Product Marketing, Demand Generation, Sales Enablement, Customer Marketing, Website & CRO, Market Research, Analytics & Reporting, Campaign Management, Operations.`
: `You are an elite Growth Marketing & Product Marketing Specialist.
The user provides you with their monthly worklog, backlog of unscheduled tasks, and monthly KPI results (Execution vs Conversion targets) for a specific month.
Your goal is to write a highly professional, actionable, and detailed Growth Marketing audit and advisory report in Vietnamese (Tiếng Việt).
Use clean Markdown formatting, professional Vietnamese business-marketing terminology, and structured bullet points.

Adhere to the following report sections:
1. Nhận xét Tổng quan (Executive summary of the month's accomplishments and overall momentum)
2. Phân tích KPI Execution & Conversion (Critique specific metrics: Social posts, Email campaigns, Case Studies, Leads/MQLs, Website conversions, Email contacts. Calculate percentages where helpful and highlight bottlenecks)
3. Khuyến nghị Chiến thuật (Actionable Tactics - provide 3-4 concrete tips to optimize current campaigns, repurpose content, or prioritize backlog items)
4. Ý tưởng Campaign / Content gợi ý (Provide 2 highly creative, realistic, and tailored campaign or content ideas for this marketer to try)

Ensure you address the specific category standards in their logs: Content Marketing, Product Marketing, Demand Generation, Sales Enablement, Customer Marketing, Website & CRO, Market Research, Analytics & Reporting, Campaign Management, Operations.`;

    const userPrompt = isEn ? `
Reporting Month: ${month}

KPI Targets & Actuals:
- Social Content: Target 12-15 posts (including >3 case study/insight). Completed posts in worklog: ${worklog.filter((t: any) => t.category === "Content Marketing" && t.status === "Done").length} posts.
- Email Campaigns: Target 2 campaigns. Completed campaigns in worklog: ${worklog.filter((t: any) => t.category === "Campaign Management" && t.status === "Done").length} campaigns.
- Sales Asset / Case Study: Target 2 assets. Completed deliverables in worklog: ${worklog.filter((t: any) => (t.category === "Sales Enablement" || t.category === "Customer Marketing") && t.status === "Done").length} deliverables.
- Funnel Leads: ${kpis.leadsActual || 0} / 10 (including MQLs: ${kpis.mqlsActual || 0} / 6)
- Website Conversion Actions: ${kpis.webConvActual || 0} / 20
- Net New Email Contacts: ${kpis.emailContactsActual || 0} / 30

Scheduled Tasks in Worklog:
${JSON.stringify(worklog.map((t: any) => ({ title: t.title, category: t.category, status: t.status, priority: t.priority })), null, 2)}

Unscheduled Backlog Tasks:
${JSON.stringify(backlog.map((t: any) => ({ title: t.title, category: t.category, priority: t.priority })), null, 2)}
` : `
Tháng báo cáo: ${month}

Kế hoạch KPIs & Thực tế:
- Content Social: Mục tiêu 12-15 bài (trong đó >3 case study/insight). Số lượng bài hoàn thành trong worklog: ${worklog.filter((t: any) => t.category === "Content Marketing" && t.status === "Done").length} bài.
- Email Campaigns: Mục tiêu 2 chiến dịch. Số lượng hoàn thành trong worklog: ${worklog.filter((t: any) => t.category === "Campaign Management" && t.status === "Done").length} chiến dịch.
- Sales Asset / Case Study: Mục tiêu 2 tài liệu. Số lượng hoàn thành trong worklog: ${worklog.filter((t: any) => (t.category === "Sales Enablement" || t.category === "Customer Marketing") && t.status === "Done").length} tài liệu.
- Leads đạt được: ${kpis.leadsActual || 0} / 10 (trong đó MQLs: ${kpis.mqlsActual || 0} / 6)
- Website Conversion Actions: ${kpis.webConvActual || 0} / 20
- Email Contacts mới: ${kpis.emailContactsActual || 0} / 30

Danh sách các task đã lên lịch (Worklog):
${JSON.stringify(worklog.map((t: any) => ({ title: t.title, category: t.category, status: t.status, priority: t.priority, impact: t.impact })), null, 2)}

Danh sách các task tồn đọng chưa lên lịch (Backlog):
${JSON.stringify(backlog.map((t: any) => ({ title: t.title, category: t.category, priority: t.priority })), null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error during AI analysis" });
  }
});

// Serve API routes first
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Setup Vite Dev Server / Static serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
