import OpenAI from "openai";
import { z } from "zod";
import { getAnalysisCache, saveAnalysisCache } from "../db/db";
import { JdAnalysisResultSchema } from "../types/schema";
import type { JdAnalysisResult } from "../types/schema";

export type JobDescriptionAnalysis = JdAnalysisResult;

export type ResumeOptimizationAnalysis = {
  matchScore: number;
  coreStrengths: string[];
  optimizationDirections: string[];
  specificSuggestions: string[];
};

export type InterviewReviewAiAnalysis = {
  intent: string;
  suggestions: string[];
  optimizedSuggestion: string;
};

export type PreparationStrategyItem = {
  category: "business" | "skill" | "project";
  knowledgePoint: string;
  question: string;
  guidance: string;
};

const AI_MODEL = "qwen3.7-max";
const DEFAULT_AI_TIMEOUT_MS = 60_000;
const LONG_AI_TIMEOUT_MS = 120_000;
const configuredAiProxyUrl = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env?.VITE_AI_PROXY_URL?.trim();
const AI_BASE_URL =
  configuredAiProxyUrl ||
  (typeof window === "undefined" ? "http://localhost:5173/api/ai" : new URL("/api/ai", window.location.origin).toString());

const client = new OpenAI({
  baseURL: AI_BASE_URL,
  apiKey: "proxy",
  dangerouslyAllowBrowser: true,
  timeout: DEFAULT_AI_TIMEOUT_MS,
  maxRetries: 0
});

const LegacyJobDescriptionAnalysisSchema = z.object({
  summary: z.string().trim().default(""),
  keywords: z.array(z.string().trim()).default([]),
  coreRequirements: z.array(z.string().trim()).default([]),
  hardSkills: z.array(z.string().trim()).default([]),
  softSkills: z.array(z.string().trim()).default([]),
  riskPoints: z.array(z.string().trim()).default([])
});

const ResumeOptimizationAnalysisSchema = z
  .object({
    matchScore: z.number().int().min(0).max(100),
    coreStrengths: z.array(z.string().trim()).optional(),
    optimizationDirections: z.array(z.string().trim()).optional(),
    specificSuggestions: z.array(z.string().trim()).optional(),
    strengths: z.array(z.string().trim()).optional(),
    weaknesses: z.array(z.string().trim()).optional(),
    suggestions: z.array(z.string().trim()).optional()
  })
  .transform(({ strengths, weaknesses, suggestions, ...value }) => ({
    matchScore: value.matchScore,
    coreStrengths: normalizeList(value.coreStrengths ?? strengths ?? []),
    optimizationDirections: normalizeList(value.optimizationDirections ?? weaknesses ?? []),
    specificSuggestions: normalizeList(value.specificSuggestions ?? suggestions ?? [])
  }));

const InterviewReviewAiAnalysisSchema = z
  .object({
    intent: z.string().trim().min(1, "\u63d0\u95ee\u610f\u56fe\u4e0d\u80fd\u4e3a\u7a7a"),
    suggestions: z.array(z.string().trim()).default([]),
    optimizedSuggestion: z.string().trim().default("")
  })
  .transform(({ intent, suggestions, optimizedSuggestion }) => ({
    intent,
    suggestions: suggestions.filter(Boolean),
    optimizedSuggestion: optimizedSuggestion.trim() || suggestions.filter(Boolean).join("\uFF1B")
  }));

const PreparationStrategyItemSchema = z.object({
  category: z.enum(["business", "skill", "project"]),
  knowledgePoint: z.string().trim().min(1),
  question: z.string().trim().min(1),
  guidance: z.string().trim().default("")
});

const PreparationStrategyResponseSchema = z.object({
  prepList: z.array(PreparationStrategyItemSchema).min(1)
});

const PreparationQuestionResponseSchema = z.object({
  question: z.string().trim().min(1),
  guidance: z.string().trim().min(1)
});

function normalizeList(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function normalizeJobDescriptionAnalysis(value: z.input<typeof JdAnalysisResultSchema>): JobDescriptionAnalysis {
  const parsed = JdAnalysisResultSchema.parse(value);
  const keywordWords = new Set<string>();

  return {
    basicInfo: parsed.basicInfo,
    mustHave: {
      ...parsed.mustHave,
      requiredSkills: normalizeList(parsed.mustHave.requiredSkills),
      requiredCerts: normalizeList(parsed.mustHave.requiredCerts)
    },
    niceToHave: {
      preferredSkills: normalizeList(parsed.niceToHave.preferredSkills),
      preferredExperience: normalizeList(parsed.niceToHave.preferredExperience),
      preferredCerts: normalizeList(parsed.niceToHave.preferredCerts)
    },
    keywords: parsed.keywords
      .filter((keyword) => {
        const word = keyword.word.trim();
        if (!word || keywordWords.has(word)) return false;
        keywordWords.add(word);
        return true;
      })
      .slice(0, 5),
    riskPoints: parsed.riskPoints.filter((risk) => risk.label).slice(0, 3),
    profile: parsed.profile
  };
}

function coerceJobDescriptionAnalysisInput(value: Partial<Omit<JobDescriptionAnalysis, "keywords">> & { keywords?: unknown[] }) {
  return {
    ...value,
    keywords: (value.keywords ?? []).map((keyword) =>
      typeof keyword === "string" ? { word: keyword, weight: 2 as const } : keyword
    )
  };
}

function normalizeLegacyJobDescriptionAnalysis(value: z.infer<typeof LegacyJobDescriptionAnalysisSchema>): JobDescriptionAnalysis {
  const coreRequirements = normalizeList(value.coreRequirements.length > 0 ? value.coreRequirements : value.hardSkills);
  const hardSkills = normalizeList(value.hardSkills.length > 0 ? value.hardSkills : coreRequirements);
  const softSkills = normalizeList(value.softSkills);
  const keywords = normalizeList(value.keywords);
  const riskPoints = normalizeList(value.riskPoints);
  const summary = value.summary.trim() || coreRequirements[0] || hardSkills[0] || "";

  return normalizeJobDescriptionAnalysis({
    mustHave: {
      education: null,
      experience: null,
      requiredSkills: hardSkills.length > 0 ? hardSkills : coreRequirements,
      requiredCerts: [],
      language: null
    },
    niceToHave: {
      preferredSkills: softSkills,
      preferredExperience: [],
      preferredCerts: []
    },
    keywords: keywords.map((word) => ({ word, weight: 2 as const })),
    riskPoints: riskPoints.map((description) => ({
      label: description.slice(0, 12),
      description,
      severity: "medium" as const
    })),
    profile: summary
  });
}

function extractSection(markdown: string, heading: string) {
  const match = markdown.match(new RegExp(`### ${heading}\\s+([\\s\\S]*?)(?:\\n### |\\n$)`));
  return match?.[1]?.trim() ?? "";
}

function parseList(section: string) {
  return parseListClean(section);
}

function parseListClean(section: string) {
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function normalizeAIErrorClean(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/timeout|timed out/i.test(message)) {
    return new Error("AI \u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
  }

  if (/401|unauthor|api key|authentication/i.test(message)) {
    return new Error("AI \u670d\u52a1\u5bc6\u94a5\u7f3a\u5931\u6216\u65e0\u6548\uff0c\u8bf7\u68c0\u67e5\u73af\u5883\u53d8\u91cf\u914d\u7f6e\u3002");
  }

  if (/network|fetch|failed to fetch/i.test(message)) {
    return new Error("AI \u7f51\u7edc\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u540e\u91cd\u8bd5\u3002");
  }

  return new Error(`AI \u8c03\u7528\u5931\u8d25\uff1a${message}`);
}

function compactAiContextClean(text: string, maxChars: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;

  const headLength = Math.floor(maxChars * 0.72);
  const tailLength = maxChars - headLength;
  return `${normalized.slice(0, headLength)}\n\n[\u5185\u5bb9\u8f83\u957f\uff0c\u5df2\u622a\u65ad\u4e2d\u95f4\u90e8\u5206]\n\n${normalized.slice(-tailLength)}`;
}

function extractProjectsFromResumeClean(resumeText: string) {
  const normalized = resumeText.replace(/\r\n/g, "\n");
  const sectionPattern =
    /(?:^|\n)\s*(?:\u9879\u76ee\u7ecf\u5386|\u9879\u76ee\u7ecf\u9a8c|\u5b9e\u4e60\u7ecf\u5386|\u5de5\u4f5c\u7ecf\u5386|\u5b9e\u8df5\u7ecf\u5386|\u76f8\u5173\u7ecf\u5386|Project Experience|Projects|Experience)\s*[:\uff1a]?\s*([\s\S]*?)(?=\n\s*(?:\u6559\u80b2\u7ecf\u5386|\u6559\u80b2\u80cc\u666f|\u6280\u80fd|\u4e13\u4e1a\u6280\u80fd|\u4e2a\u4eba\u6280\u80fd|\u83b7\u5956|\u8bc1\u4e66|\u6821\u56ed\u7ecf\u5386|\u81ea\u6211\u8bc4\u4ef7|\u5176\u4ed6|Education|Skills|Awards|Certificates|Summary|$))/i;
  const match = normalized.match(sectionPattern);

  return compactAiContextClean(match?.[1]?.trim() || normalized, 4000);
}

function extractJsonText(text: string) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(extractJsonText(text)) as T;
  } catch {
    throw new Error("AI \u8fd4\u56de\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u8bf7\u91cd\u8bd5\u3002");
  }
}

function normalizeAIError(error: unknown) {
  return normalizeAIErrorClean(error);
}

async function createSha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function compactAiContext(text: string, maxChars: number) {
  return compactAiContextClean(text, maxChars);
}

function extractProjectsFromResume(resumeText: string) {
  return extractProjectsFromResumeClean(resumeText);
}

function normalizePreparationStrategy(items: PreparationStrategyItem[]) {
  const seen = new Set<string>();

  return items
    .map((item) => ({
      category: item.category,
      knowledgePoint: item.knowledgePoint.trim(),
      question: item.question.trim(),
      guidance: item.guidance.trim()
    }))
    .filter((item) => {
      const key = `${item.category}:${item.knowledgePoint}`;
      if (!item.knowledgePoint || !item.question || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 18);
}

function buildFallbackPreparationItems(
  jdAnalysis: JobDescriptionAnalysis,
  resumeOptimization: ResumeOptimizationAnalysis,
  existingKnowledgeItems: Array<{ knowledgePoint: string; category: PreparationStrategyItem["category"] }> = []
): PreparationStrategyItem[] {
  const existingBusinessTopics = existingKnowledgeItems.filter((item) => item.category === "business").map((item) => item.knowledgePoint);
  const existingSkillTopics = existingKnowledgeItems.filter((item) => item.category === "skill").map((item) => item.knowledgePoint);
  const existingProjectTopics = existingKnowledgeItems.filter((item) => item.category === "project").map((item) => item.knowledgePoint);
  const businessTopics = normalizeList([...existingBusinessTopics, jdAnalysis.profile, jdAnalysis.basicInfo.jobTitle, jdAnalysis.riskPoints[0]?.label ?? ""]);
  const skillTopics = normalizeList([...existingSkillTopics, ...jdAnalysis.mustHave.requiredSkills, ...jdAnalysis.niceToHave.preferredSkills, ...jdAnalysis.keywords.map((item) => item.word)]);
  const projectTopics = normalizeList([...existingProjectTopics, ...resumeOptimization.coreStrengths, ...resumeOptimization.optimizationDirections, ...resumeOptimization.specificSuggestions]);

  const questionByCategory: Record<PreparationStrategyItem["category"], string> = {
    business: "\u8bf7\u7ed3\u5408\u5c97\u4f4d\u4e1a\u52a1\u76ee\u6807\uff0c\u8bf4\u660e\u4f60\u4f1a\u5982\u4f55\u62c6\u89e3\u5173\u952e\u95ee\u9898\u5e76\u5224\u65ad\u4f18\u5148\u7ea7\u3002",
    skill: "\u8bf7\u7ed3\u5408\u4e00\u4e2a\u5177\u4f53\u573a\u666f\uff0c\u8bf4\u660e\u8be5\u6280\u80fd\u5982\u4f55\u5e2e\u52a9\u4f60\u89e3\u51b3\u771f\u5b9e\u5de5\u4f5c\u95ee\u9898\u3002",
    project: "\u8bf7\u7ed3\u5408\u8fc7\u5f80\u9879\u76ee\uff0c\u8bf4\u660e\u4f60\u5982\u4f55\u5e94\u7528\u8be5\u4e3b\u9898\u5e76\u8bc1\u660e\u81ea\u5df1\u7684\u5173\u952e\u8d21\u732e\u3002"
  };
  const guidanceByCategory: Record<PreparationStrategyItem["category"], string> = {
    business: "\u5efa\u8bae\u4ece\u4e1a\u52a1\u76ee\u6807\u3001\u7528\u6237\u4ef7\u503c\u3001\u5173\u952e\u6307\u6807\u548c\u5546\u4e1a\u95ed\u73af\u5c55\u5f00\uff0c\u907f\u514d\u53ea\u505c\u7559\u5728\u6982\u5ff5\u63cf\u8ff0\u3002",
    skill: "\u5efa\u8bae\u8bf4\u660e\u5e95\u5c42\u539f\u7406\u3001\u9002\u7528\u573a\u666f\u3001\u4f60\u7684\u5b9e\u9645\u505a\u6cd5\u548c\u6700\u7ec8\u7ed3\u679c\uff0c\u907f\u514d\u53ea\u7f57\u5217\u5de5\u5177\u540d\u79f0\u3002",
    project: "\u5efa\u8bae\u6309\u80cc\u666f\u3001\u4e2a\u4eba\u89d2\u8272\u3001\u5173\u952e\u96be\u70b9\u3001\u5177\u4f53\u884c\u52a8\u548c\u91cf\u5316\u7ed3\u679c\u56de\u7b54\uff0c\u7a81\u51fa\u4e2a\u4eba\u8d21\u732e\u3002"
  };
  const categories: Array<{ category: PreparationStrategyItem["category"]; topics: string[]; label: string }> = [
    { category: "business", topics: businessTopics, label: "\u4e1a\u52a1\u7406\u89e3" },
    { category: "skill", topics: skillTopics, label: "\u6280\u80fd\u8003\u5bdf" },
    { category: "project", topics: projectTopics, label: "\u9879\u76ee\u6df1\u6316" }
  ];
  const items: PreparationStrategyItem[] = [];
  for (const { category, topics, label } of categories) {
    topics.slice(0, 5).forEach((topic) => {
      items.push({ category, knowledgePoint: topic, question: `${questionByCategory[category]} \u8bf7\u91cd\u70b9\u56f4\u7ed5\u201c${topic}\u201d\u7ed9\u51fa\u5177\u4f53\u6848\u4f8b\u3002`, guidance: guidanceByCategory[category] });
    });
    while (items.filter((item) => item.category === category).length < 5) {
      const nextIndex = items.filter((item) => item.category === category).length + 1;
      items.push({ category, knowledgePoint: `${label}\u8865\u5145\u8003\u70b9 ${nextIndex}`, question: questionByCategory[category], guidance: guidanceByCategory[category] });
    }
  }
  return items.slice(0, 18);
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options: { timeoutMs?: number; maxTokens?: number } = {}
) {
  try {
    const response = await client.chat.completions.create(
      {
        model: AI_MODEL,
        temperature: 0.2,
        max_tokens: options.maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      },
      { timeout: options.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS }
    );

    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    throw normalizeAIErrorClean(error);
  }
}

export function parseJobDescriptionAnalysis(serialized?: string | null) {
  if (!serialized?.trim()) return null;

  try {
    const parsed = JSON.parse(serialized) as unknown;
    const newResult = JdAnalysisResultSchema.safeParse(parsed);
    if (newResult.success) return normalizeJobDescriptionAnalysis(newResult.data);

    const legacyResult = LegacyJobDescriptionAnalysisSchema.safeParse(parsed);
    if (legacyResult.success) {
      return normalizeLegacyJobDescriptionAnalysis(legacyResult.data);
    }
  } catch {
    // Fall back to markdown parsing.
  }

  const summary =
    extractSection(serialized, "Job Summary") ||
    extractSection(serialized, "AI Analysis") ||
    extractSection(serialized, "Role Summary");
  const keywords = parseListClean(extractSection(serialized, "Keywords"));
  const coreRequirements = parseListClean(extractSection(serialized, "Core Requirements"));
  const hardSkills = parseListClean(extractSection(serialized, "Hard Skills"));
  const softSkills = parseListClean(extractSection(serialized, "Soft Skills"));
  const riskPoints = parseListClean(extractSection(serialized, "Risk Points"));

  if (!summary && keywords.length === 0 && coreRequirements.length === 0 && hardSkills.length === 0 && softSkills.length === 0 && riskPoints.length === 0) {
    return null;
  }

  return normalizeLegacyJobDescriptionAnalysis(
    LegacyJobDescriptionAnalysisSchema.parse({
      summary,
      keywords,
      coreRequirements,
      hardSkills,
      softSkills,
      riskPoints
    })
  );
}

function buildFallbackJobDescriptionAnalysis(jdText: string): JobDescriptionAnalysis {
  const normalized = jdText.replace(/\s+/g, " ").trim();
  const asciiMatches = normalized.match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g) ?? [];
  const chineseMatches = normalized.match(/[\u4e00-\u9fa5]{2,8}/g) ?? [];
  const keywordWords = normalizeList([...asciiMatches, ...chineseMatches]).slice(0, 5);

  return normalizeJobDescriptionAnalysis({
    basicInfo: {
      jobTitle: "",
      company: null,
      department: null,
      location: null,
      employmentType: null
    },
    mustHave: {
      education: null,
      experience: null,
      requiredSkills: keywordWords,
      requiredCerts: [],
      language: null
    },
    niceToHave: {
      preferredSkills: [],
      preferredExperience: [],
      preferredCerts: []
    },
    keywords: keywordWords.map((word, index) => ({
      word,
      weight: index < 2 ? 3 : index < 4 ? 2 : 1
    })),
    riskPoints: [
      {
        label: "\u9700\u4eba\u5de5\u590d\u6838",
        description: "",
        severity: "low"
      }
    ],
    profile: normalized.slice(0, 180) || "\u672a\u63d0\u4f9b JD \u539f\u6587\u3002"
  });
}

export async function analyzeJobDescription(jdText: string) {
  const systemPrompt = `你是一个资深招聘专家和岗位分析师。请对以下岗位 JD 进行深度拆解，严格按照以下维度逐项分析。

## 分析维度

### 1. 硬性门槛（mustHave）
从 JD 中提取求职者必须具备的条件，缺少任何一项都可能导致简历被筛掉：
- education：学历要求（如"本科及以上"）
- experience：工作年限要求（如"3年以上"）
- requiredSkills：必备技能列表（数组，JD 中明确要求"必须"/"精通"/"熟练掌握"的技能）
- requiredCerts：必备证书/资质（数组，如 CPA、PMP 等，没有则返回空数组）
- language：语言能力要求（如"英语流利"，没有则返回 null）

### 2. 加分项（niceToHave）
从 JD 中提取"优先考虑"/"有...经验者优先"/"加分项"等描述的内容：
- preferredSkills：加分技能列表（数组）
- preferredExperience：加分经验描述（数组）
- preferredCerts：加分证书（数组）

### 3. 关键词提取（keywords）
提取该岗位最核心的 3-5 个关键词，用于后续简历匹配度计算：
- 优先提取：技术栈名称、行业术语、岗位核心职能词
- 排除：公司名、福利描述、通用词汇（如"团队合作"、"沟通能力"等软技能，除非 JD 特别强调）

### 4. 风险点分析（riskPoints）
分析该 JD 中可能存在的潜在风险或需要注意的点，例如：
- 岗位职责描述模糊，可能意味着工作内容不固定
- 要求"能适应高强度工作"/"抗压能力强"，可能暗示加班严重
- 薪资范围过大（如 15k-40k），可能实际薪资偏低
- 频繁使用"负责"而非"主导"，可能岗位层级较低
- 要求技能过多过杂，可能岗位定位不清晰
- 其他你认为值得求职者注意的信号

每条风险点需包含：
- label：风险标签（简短）
- description：具体说明

### 5. 岗位画像总结（profile）
用 2-3 句话总结这个岗位最理想的人选画像，帮助求职者快速判断自己是否适合。

## 输出要求
- 严格按照上述结构返回 JSON
- 所有数组字段如果没有内容，返回空数组 []，不要省略字段
- 所有可选字段如果没有信息，返回 null，不要省略字段
- 关键词数量控制在 3-5 个
- 风险点数量控制在 1-3 个
- 分析必须基于 JD 原文，不要臆造信息

请以 JSON 格式返回，包含以下顶层字段：
mustHave、niceToHave、keywords、riskPoints、profile`;
  const cacheKey = await createSha256(`jdAnalysis\n${jdText.trim()}`);
  const cached = await getAnalysisCache(cacheKey, "jdAnalysis");

  if (cached) {
    try {
      const cachedResult = JdAnalysisResultSchema.safeParse(JSON.parse(cached.result));
      if (cachedResult.success) return normalizeJobDescriptionAnalysis(cachedResult.data);
    } catch {
      // Ignore malformed cache entries and request a fresh analysis.
    }
  }

  const responseText = await callAI(systemPrompt, compactAiContextClean(jdText, 5000), { maxTokens: 800 });
  let parsedJson: Partial<JobDescriptionAnalysis>;

  try {
    parsedJson = parseJsonResponse<Partial<JobDescriptionAnalysis>>(responseText);
  } catch {
    return buildFallbackJobDescriptionAnalysis(jdText);
  }

  const parsed = JdAnalysisResultSchema.safeParse(coerceJobDescriptionAnalysisInput(parsedJson));

  if (!parsed.success) {
    return buildFallbackJobDescriptionAnalysis(jdText);
  }

  const result = normalizeJobDescriptionAnalysis(parsed.data);
  await saveAnalysisCache({
    id: cacheKey,
    type: "jdAnalysis",
    result: JSON.stringify(result),
    createdAt: Date.now()
  });

  return result;
}
export async function analyzeResumeOptimization(jdText: string, resumeText: string, jdAnalysis?: JobDescriptionAnalysis | null) {
  const systemPrompt = `You are a senior resume matching evaluator. Score the candidate resume against the target JD and return JSON only with fields: matchScore, coreStrengths, optimizationDirections, specificSuggestions. The suggestions must be concrete and aligned with the JD.`;
  const cacheKey = await createSha256(`resumeMatch\n${jdText.trim()}\n---RESUME---\n${resumeText.trim()}`);
  const cached = await getAnalysisCache(cacheKey, "resumeMatch");

  if (cached) {
    try {
      const cachedResult = ResumeOptimizationAnalysisSchema.safeParse(JSON.parse(cached.result));
      if (cachedResult.success) return cachedResult.data;
    } catch {
      // Ignore malformed cache entries and request a fresh analysis.
    }
  }

  const jdAnalysisContext = jdAnalysis
    ? JSON.stringify(
        {
          basicInfo: jdAnalysis.basicInfo,
          mustHave: jdAnalysis.mustHave,
          niceToHave: jdAnalysis.niceToHave,
          keywords: jdAnalysis.keywords,
          riskPoints: jdAnalysis.riskPoints,
          profile: jdAnalysis.profile
        },
        null,
        2
      )
    : "No JD analysis provided.";

  const responseText = await callAI(
    systemPrompt,
    `Previous JD analysis:\n${jdAnalysisContext}\n\nJob JD:\n${compactAiContextClean(jdText, 4500)}\n\nCandidate resume:\n${compactAiContextClean(resumeText, 8000)}`,
    { timeoutMs: LONG_AI_TIMEOUT_MS, maxTokens: 1100 }
  );
  const parsed = ResumeOptimizationAnalysisSchema.safeParse(parseJsonResponse<Partial<ResumeOptimizationAnalysis>>(responseText));

  if (!parsed.success) {
    throw new Error("AI \u8fd4\u56de\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u8bf7\u91cd\u8bd5\u3002");
  }

  await saveAnalysisCache({
    id: cacheKey,
    type: "resumeMatch",
    result: JSON.stringify(parsed.data),
    createdAt: Date.now()
  });

  return parsed.data;
}

export async function analyzeInterviewReview(jdText: string, question: string, userAnswer: string) {
  const systemPrompt = "You are an interview coach. Return JSON only with fields intent and suggestions.";
  const responseText = await callAI(
    systemPrompt,
    `Job JD:\n${compactAiContextClean(jdText, 3500)}\n\nInterview question:\n${question}\n\nCandidate answer:\n${compactAiContextClean(userAnswer, 2500)}`,
    { maxTokens: 600 }
  );
  const parsed = InterviewReviewAiAnalysisSchema.safeParse(parseJsonResponse<Partial<InterviewReviewAiAnalysis>>(responseText));

  if (!parsed.success) {
    throw new Error("AI \u8fd4\u56de\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u8bf7\u91cd\u8bd5\u3002");
  }

  return parsed.data;
}

export async function generatePreparationStrategy(
  jdAnalysis: JobDescriptionAnalysis,
  resumeAnalysis: ResumeOptimizationAnalysis
) {
  return generatePreparationStrategyStrict(jdAnalysis, resumeAnalysis, "", "", []);
}

export async function generatePreparationStrategyStrict(
  jdAnalysis: JobDescriptionAnalysis,
  resumeOptimization: ResumeOptimizationAnalysis,
  resumeText = "",
  resumeFileName = "",
  existingKnowledgeItems: Array<{ knowledgePoint: string; category: PreparationStrategyItem["category"] }> = []
) {
  const SYSTEM_PROMPT_V4 = `
You are a senior interviewer with 15 years of experience at P8/P9 level. Your style is objective, serious, professional, and incisive.
Your task is to generate an interview preparation checklist focused on deep resume probing.

Absolute prohibitions:
1. Do not repeat JD text. Never copy long JD phrases such as "the ideal candidate is..." or "has the ability to..." into questions. Convert them into concrete business actions or technical decision points.
2. Do not create fill-in-the-blank questions. Never use patterns like "please explain around [keyword]" or "please focus on [JD text]".
3. Do not ask definition questions. Do not ask "what is risk control". Ask questions such as "in your project, how did you balance risk interception rate and user experience?"
4. Do not fabricate. Every question must be based on resume facts or a realistic business scenario derived from the JD requirements. Do not invent candidate experiences.

Question logic:
For every generated question, internally follow this process:
1. Extract a core capability from the JD, such as data analysis or MVP design.
2. Find an anchor in the resume project details.
   - If an anchor exists, ask deep STAR-style follow-up questions.
   - If no anchor exists, build a realistic business challenge for this role and ask how the candidate would solve it.
3. Convert capability nouns into behavioral verbs.
   - Bad: "Please explain your data analysis ability."
   - Good: "In your project, when data was missing, how did you build an evaluation model to support the decision?"

Output requirements:
- Return valid JSON only.
- All content must be Simplified Chinese.
- Generate at least 3 items per category.

Return JSON only:
{
  "prepList": [
    {
      "category": "business" | "skill" | "project",
      "knowledgePoint": "Short keyword, in Simplified Chinese",
      "question": "Specific deep-dive question, in Simplified Chinese",
      "guidance": "What the interviewer is looking for, in Simplified Chinese"
    }
  ]
}
`;

  const explicitKeyPoints = ((jdAnalysis as any).keyRequirements ?? [])
    .map((item: any) => item.keyword)
    .filter(Boolean);
  const jdKeyPoints = normalizeList([
    ...explicitKeyPoints,
    jdAnalysis.basicInfo.jobTitle,
    ...jdAnalysis.mustHave.requiredSkills,
    ...jdAnalysis.mustHave.requiredCerts,
    ...jdAnalysis.niceToHave.preferredSkills,
    ...jdAnalysis.niceToHave.preferredExperience,
    ...jdAnalysis.keywords.map((item) => item.word)
  ]);
  const cleanContext = {
    jdKeyPoints,
    resumeProjectDetails: resumeText ? extractProjectsFromResume(resumeText) : "not provided",
    candidateGap: {
      strengths: resumeOptimization.coreStrengths?.slice(0, 3) ?? [],
      weaknesses: resumeOptimization.optimizationDirections?.slice(0, 3) ?? []
    },
    existingKnowledgeItems
  };

  const userPrompt = `
# Context Data
## JD Core Requirements (Source of Truth for Topics)
${cleanContext.jdKeyPoints.join("\n")}

## Candidate Resume Facts (Source of Truth for Evidence)
${cleanContext.resumeProjectDetails}

## Candidate Gaps (Areas to Probe)
${JSON.stringify(cleanContext.candidateGap)}

## Existing Preparation Items (Must Also Be Covered)
${JSON.stringify(cleanContext.existingKnowledgeItems, null, 2)}

# Task
Generate 9 high-quality interview questions (3 Business, 3 Skill, 3 Project).
If Existing Preparation Items are provided, every existing item must be included in prepList. Keep its original knowledgePoint and category, and generate a concrete question and guidance for it.
If including all Existing Preparation Items makes the list longer than 9, include all of them and still keep the overall category coverage balanced.

# Critical: Avoid These Bad Patterns (Based on previous failures)
Do NOT generate questions like: "Please explain [JD Requirement]".
Do NOT use the phrase "Please focus on [JD Text]".
These are lazy and unhelpful. You must synthesize a specific question based on the intersection of JD and Resume.

# Step-by-Step Generation Process (Internal Monologue)
For each item you generate, you must follow this logic:
1. Identify a specific requirement from JD, such as "Risk Control".
2. Look at Resume. Did they do Risk Control?
   - YES: Ask about a specific trade-off or bottleneck they faced in that project.
   - NO: Create a realistic scenario relevant to the JD, such as "How would you design a risk rule for a new payment feature?", and ask how they would approach it.
3. Draft the question using professional, objective tone.

# Output Format
Return ONLY a valid JSON object. No markdown, no explanation. All generated content must be Simplified Chinese.
{
  "prepList": [
    {
      "category": "business" | "skill" | "project",
      "knowledgePoint": "Short keyword, such as 'Risk Strategy Design'",
      "question": "The specific, deep-dive question derived from logic above.",
      "guidance": "What the interviewer is looking for, such as 'Look for data-driven decision making'."
    }
  ]
}
`;

  try {
    const responseText = await callAI(SYSTEM_PROMPT_V4, userPrompt, {
      timeoutMs: LONG_AI_TIMEOUT_MS,
      maxTokens: 1800
    });
    const parsed = PreparationStrategyResponseSchema.safeParse(
      parseJsonResponse<{ prepList: PreparationStrategyItem[] }>(responseText)
    );

    if (parsed.success) {
      return normalizePreparationStrategy(parsed.data.prepList);
    }
  } catch {
    // Fall through to a stable local fallback.
  }

  return buildFallbackPreparationItems(jdAnalysis, resumeOptimization, existingKnowledgeItems);
}

export async function generatePreparationQuestion(
  knowledgePoint: string,
  category: PreparationStrategyItem["category"],
  jdAnalysis: JobDescriptionAnalysis | null,
  resumeOptimization: ResumeOptimizationAnalysis | null,
  resumeText = "",
  resumeFileName = ""
) {
  const systemPrompt = `You are an interview preparation coach. Return JSON only with fields question and guidance. Both fields must be written in Simplified Chinese. The question must be concrete, scenario-based, and aligned with the knowledge point, JD analysis, and resume analysis.`;
  const userPrompt = `
Category: ${category}
Knowledge point: ${knowledgePoint}

JD analysis:
${JSON.stringify(jdAnalysis, null, 2)}

Resume analysis:
${JSON.stringify(resumeOptimization, null, 2)}

Resume file:
${resumeFileName || "not specified"}

Resume text:
${resumeText ? compactAiContextClean(resumeText, 3000) : "not provided"}`;
  try {
    const responseText = await callAI(systemPrompt, userPrompt, { timeoutMs: 30_000, maxTokens: 250 });
    const parsed = PreparationQuestionResponseSchema.safeParse(parseJsonResponse<{ question: string; guidance: string }>(responseText));
    if (parsed.success) return parsed.data;
  } catch {
    // Use a deterministic fallback if the model call fails.
  }
  return {
    question: `\u8bf7\u7ed3\u5408\u4f60\u7684\u771f\u5b9e\u7ecf\u5386\uff0c\u8bf4\u660e\u4f60\u4f1a\u5982\u4f55\u5904\u7406\u4e0e\u201c${knowledgePoint}\u201d\u76f8\u5173\u7684\u5177\u4f53\u4e1a\u52a1\u6216\u9879\u76ee\u573a\u666f\u3002`,
    guidance: "\u5efa\u8bae\u5148\u4ea4\u4ee3\u573a\u666f\u548c\u76ee\u6807\uff0c\u518d\u8bf4\u660e\u62c6\u89e3\u601d\u8def\u3001\u5173\u952e\u53d6\u820d\u3001\u6267\u884c\u52a8\u4f5c\u548c\u6700\u7ec8\u7ed3\u679c\u3002"
  };
}
