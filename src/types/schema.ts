import { z } from "zod";

export const ApplicationStatusSchema = z.enum([
  "准备中",
  "已投递",
  "笔试中",
  "面试中",
  "一面中",
  "二面中",
  "三面中",
  "N面中",
  "HR面中",
  "Offer",
  "已拒绝",
  "已归档"
]);

export const SelfAssessmentSchema = z.enum([
  "\u516c\u76ca\u7ec4\u7ec7/\u793e\u4f1a\u56e2\u4f53",
  "\u80a1\u4efd/\u96c6\u4f53/\u6df7\u5408/\u5176\u4ed6\u6027\u8d28",
  "\u6c11\u8425\u4f01\u4e1a",
  "\u4e8b\u4e1a\u5355\u4f4d",
  "\u5916\u4f01",
  "\u592e\u56fd\u4f01",
  "\u4e2d\u5916\u5408\u8d44/\u6e2f\u6fb3\u5408\u8d44"
]);

export const JdKeywordSchema = z.object({
  word: z.string().trim().min(1),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

export const JdRiskPointSchema = z.object({
  label: z.string().trim().min(1),
  description: z.string().trim().optional().default(""),
  severity: z.enum(["high", "medium", "low"]).optional().default("medium")
});

export const JdAnalysisResultSchema = z.object({
  basicInfo: z
    .object({
      jobTitle: z.string().trim().default(""),
      company: z.string().trim().nullable().default(null),
      department: z.string().trim().nullable().default(null),
      location: z.string().trim().nullable().default(null),
      employmentType: z.string().trim().nullable().default(null)
    })
    .default({
      jobTitle: "",
      company: null,
      department: null,
      location: null,
      employmentType: null
    }),
  mustHave: z.object({
    education: z.string().trim().nullable().default(null),
    experience: z.string().trim().nullable().default(null),
    requiredSkills: z.array(z.string().trim()).default([]),
    requiredCerts: z.array(z.string().trim()).default([]),
    language: z.string().trim().nullable().default(null)
  }),
  niceToHave: z.object({
    preferredSkills: z.array(z.string().trim()).default([]),
    preferredExperience: z.array(z.string().trim()).default([]),
    preferredCerts: z.array(z.string().trim()).default([])
  }),
  keywords: z.array(JdKeywordSchema).default([]),
  riskPoints: z.array(JdRiskPointSchema).default([]),
  profile: z.string().trim().default("")
});

export const ResumeOptimizationSchema = z
  .object({
    matchScore: z.number().int().min(0).max(100),
    coreStrengths: z.array(z.string().trim()).optional(),
    optimizationDirections: z.array(z.string().trim()).optional(),
    specificSuggestions: z.array(z.string().trim()).optional(),
    strengths: z.array(z.string().trim()).optional(),
    weaknesses: z.array(z.string().trim()).optional(),
    suggestions: z.array(z.string().trim()).optional()
  })
  .transform(({ strengths, weaknesses, suggestions, ...item }) => ({
    ...item,
    coreStrengths: (item.coreStrengths ?? strengths ?? []).filter(Boolean),
    optimizationDirections: (item.optimizationDirections ?? weaknesses ?? []).filter(Boolean),
    specificSuggestions: (item.specificSuggestions ?? suggestions ?? []).filter(Boolean)
  }));

export const ApplicationInputSchema = z.object({
  companyName: z.string().trim().min(1, "公司名必填"),
  roleName: z.string().trim().min(1, "岗位名必填"),
  location: z.string().trim().optional().default(""),
  applicationUrl: z.string().trim().min(1, "投递链接必填").url("请输入正确的网址"),
  appliedAt: z.string().trim().min(1, "投递日期必填"),
  status: ApplicationStatusSchema.default("已投递"),
  selfAssessment: SelfAssessmentSchema.default("\u6c11\u8425\u4f01\u4e1a"),
  latestAction: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  resumeId: z.number().int().nonnegative().optional(),
  resumeOptimizationResumeId: z.number().int().nonnegative().optional(),
  resumeOptimization: ResumeOptimizationSchema.optional()
});

export const ApplicationSchema = ApplicationInputSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ResumeSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  fileName: z.string().trim().min(1, "文件名必填"),
  uploadDate: z.string().trim().min(1, "上传时间必填"),
  fileContent: z.string().min(1, "文件内容必填"),
  extractedText: z.string().optional().default(""),
  isDefault: z.boolean()
});

export const JobDescriptionSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  rawText: z.string(),
  analysisResult: z.string().optional().default(""),
  aiAnalysisResult: z.string().optional().default(""),
  aiAnalysis: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ResumeVersionSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  version: z.string().trim().min(1, "版本号必填"),
  notes: z.string().trim().min(1, "修改说明必填"),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const PreparationCategorySchema = z.enum(["业务理解", "技能考察", "项目深挖"]);
export const PreparationSourceSchema = z.enum(["AI_GENERATED", "USER_ADDED"]);
export const PreparationStatusSchema = z.enum(["TODO", "REVIEWING", "MASTERED"]);

export const PreparationItemSchema = z
  .object({
    id: z.string(),
    applicationId: z.string(),
    content: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    category: PreparationCategorySchema.default("业务理解"),
    source: PreparationSourceSchema.default("USER_ADDED"),
    status: PreparationStatusSchema.optional(),
    aiQuestion: z.string().trim().optional().default(""),
    guidance: z.string().trim().optional().default(""),
    completed: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .superRefine((data, context) => {
    if (!data.content && !data.title) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "知识点内容必填"
      });
    }
  })
  .transform(({ title, content, status, completed, ...item }) => ({
    ...item,
    content: content ?? title ?? "",
    status: status ?? (completed ? "MASTERED" : "TODO")
  }));

export const AttachmentSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  label: z.string(),
  note: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const InterviewReviewSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  round: z.enum(["HR面", "一面", "二面", "三面", "终面", "其他"]),
  interviewDate: z.string().trim().min(1, "面试日期必填"),
  interviewer: z.string().trim().optional().default(""),
  question: z.string().trim().optional().default(""),
  userAnswer: z.string().trim().optional().default(""),
  qaNotes: z.string().trim().optional().default(""),
  aiAnalysis: z
    .object({
      intent: z.string().trim().min(1),
      suggestions: z.array(z.string().trim()).default([]),
      optimizedSuggestion: z.string().trim().default("")
    })
    .transform(({ intent, suggestions, optimizedSuggestion }) => ({
      intent,
      suggestions: suggestions.filter(Boolean),
      optimizedSuggestion: optimizedSuggestion.trim() || suggestions.filter(Boolean).join("；")
    }))
    .optional(),
  optimizedSuggestion: z.string().trim().optional().default(""),
  selfRating: z.number().int().min(1).max(5),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const TodoPrioritySchema = z.enum(["URGENT", "NORMAL", "LOW"]);

export const TodoSchema = z
  .object({
    id: z.union([z.number().int().nonnegative(), z.string()]).optional(),
    applicationId: z.string().optional(),
    content: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    priority: TodoPrioritySchema.default("NORMAL"),
    isCompleted: z.boolean().optional(),
    completed: z.boolean().optional(),
    completedAt: z.string().optional().default(""),
    createdAt: z.string().optional().default(""),
    updatedAt: z.string().optional().default("")
  })
  .superRefine((data, context) => {
    if (!data.content && !data.title) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "任务内容必填"
      });
    }
  })
  .transform(({ id, title, content, completed, isCompleted, date, createdAt, ...todo }) => ({
    ...todo,
    id,
    content: content ?? title ?? "",
    date: (date ?? createdAt.slice(0, 10)) || new Date().toISOString().slice(0, 10),
    isCompleted: isCompleted ?? completed ?? false,
    createdAt,
    updatedAt: todo.updatedAt
  }));

export const OfferDecisionFactorSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  weight: z.number().int().min(1).max(5)
});

export const OfferDecisionOptionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  scores: z.record(z.string(), z.number().int().min(1).max(10))
});

export const OfferDecisionDataSchema = z.object({
  factors: z.array(OfferDecisionFactorSchema),
  options: z.array(OfferDecisionOptionSchema).min(1)
});

export const OfferDecisionSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(1),
  createdAt: z.string(),
  isDraft: z.boolean().optional().default(false),
  data: OfferDecisionDataSchema
});

export const AnalysisCacheSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  result: z.string().min(1),
  createdAt: z.number().int().nonnegative()
});

export const BackupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string(),
    applications: z.array(ApplicationSchema).default([]),
    analysisCache: z.array(AnalysisCacheSchema).default([]),
    resumes: z.array(ResumeSchema).default([]),
    jobDescriptions: z.array(JobDescriptionSchema).default([]),
    resumeVersions: z.array(ResumeVersionSchema).default([]),
    knowledgeItems: z.array(PreparationItemSchema).default([]),
    interviewReviews: z.array(InterviewReviewSchema).default([]),
    todos: z.array(TodoSchema).default([]),
    attachments: z.array(AttachmentSchema).default([]),
    offerDecisions: z.array(OfferDecisionSchema).default([])
  })
  .strict();

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type SelfAssessment = z.infer<typeof SelfAssessmentSchema>;
export type JdAnalysisResult = z.infer<typeof JdAnalysisResultSchema>;
export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type Resume = z.infer<typeof ResumeSchema>;
export type ResumeOptimization = z.infer<typeof ResumeOptimizationSchema>;
export type JobDescription = z.infer<typeof JobDescriptionSchema>;
export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type PreparationCategory = z.infer<typeof PreparationCategorySchema>;
export type PreparationSource = z.infer<typeof PreparationSourceSchema>;
export type PreparationStatus = z.infer<typeof PreparationStatusSchema>;
export type PreparationItem = z.infer<typeof PreparationItemSchema>;
export type InterviewReview = z.infer<typeof InterviewReviewSchema>;
export type TodoPriority = z.infer<typeof TodoPrioritySchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type OfferDecisionFactor = z.infer<typeof OfferDecisionFactorSchema>;
export type OfferDecisionOption = z.infer<typeof OfferDecisionOptionSchema>;
export type OfferDecisionData = z.infer<typeof OfferDecisionDataSchema>;
export type OfferDecision = z.infer<typeof OfferDecisionSchema>;
export type AnalysisCache = z.infer<typeof AnalysisCacheSchema>;
export type BackupData = z.infer<typeof BackupSchema>;
