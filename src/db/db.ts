import Dexie, { type Table } from "dexie";
import { emitDataChanged } from "../lib/dataSync";
import { createId, nowIso } from "../lib/utils";
import { InterviewReviewSchema, OfferDecisionSchema, PreparationItemSchema, TodoSchema } from "../types/schema";
import type {
  Application,
  AnalysisCache,
  Attachment,
  InterviewReview,
  JobDescription,
  PreparationItem,
  PreparationCategory,
  PreparationSource,
  Resume,
  ResumeVersion,
  Todo,
  TodoPriority,
  OfferDecision,
  BackupData
} from "../types/schema";

class FindADecideStage3DB extends Dexie {
  applications!: Table<Application, string>;
  resumes!: Table<Resume, number>;
  jobDescriptions!: Table<JobDescription, string>;
  resumeVersions!: Table<ResumeVersion, string>;
  attachments!: Table<Attachment, string>;
  preparationItems!: Table<PreparationItem, string>;
  interviewReviews!: Table<InterviewReview, string>;
  todos!: Table<Todo, string | number>;
  offerDecisions!: Table<OfferDecision, number>;
  analysisCache!: Table<AnalysisCache, string>;

  constructor() {
    super("find-a-decide-stage3");

    this.version(1).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, completed, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt"
    });

    this.version(2).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, completed, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt",
      todos: "id, applicationId, completed, updatedAt"
    });

    this.version(3).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      resumes: "++id, uploadDate, isDefault",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, completed, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt",
      todos: "id, applicationId, completed, updatedAt"
    });

    this.version(4).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      resumes: "++id, uploadDate, isDefault",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, category, source, status, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt",
      todos: "id, applicationId, completed, updatedAt"
    });

    this.version(5).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      resumes: "++id, uploadDate, isDefault",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, category, source, status, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt",
      todos: "id, applicationId, completed, updatedAt",
      offerDecisions: "++id, createdAt"
    });

    this.version(6).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      resumes: "++id, uploadDate, isDefault",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, category, source, status, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt",
      todos: "id, date, priority, isCompleted, completedAt, applicationId",
      offerDecisions: "++id, createdAt"
    });

    this.version(7).stores({
      applications: "id, companyName, roleName, status, appliedAt, updatedAt",
      resumes: "++id, uploadDate, isDefault",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeVersions: "id, applicationId, createdAt, updatedAt",
      attachments: "id, applicationId, createdAt, updatedAt",
      preparationItems: "id, applicationId, category, source, status, updatedAt",
      interviewReviews: "id, applicationId, interviewDate, createdAt",
      todos: "id, date, priority, isCompleted, completedAt, applicationId",
      offerDecisions: "++id, createdAt",
      analysisCache: "id, type, createdAt"
    });
  }
}

export const db = new FindADecideStage3DB();

export async function loadApplicationDetail(applicationId: string) {
  const [application, jobDescription, resumeVersions, preparationItems, interviewReviews] = await Promise.all([
    db.applications.get(applicationId),
    db.jobDescriptions.where("applicationId").equals(applicationId).first(),
    db.resumeVersions.where("applicationId").equals(applicationId).sortBy("createdAt"),
    db.preparationItems.where("applicationId").equals(applicationId).sortBy("createdAt"),
    db.interviewReviews.where("applicationId").equals(applicationId).sortBy("createdAt")
  ]);

  return {
    application: application ?? null,
    jobDescription: jobDescription ?? null,
    resumeVersions: resumeVersions.reverse(),
    preparationItems: preparationItems.reverse().map((item) => PreparationItemSchema.parse(item)),
    interviewReviews: interviewReviews.reverse().map((item) => InterviewReviewSchema.parse(item))
  };
}

export async function loadResumes() {
  const resumes = await db.resumes.orderBy("uploadDate").reverse().toArray();
  return resumes.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.uploadDate.localeCompare(a.uploadDate));
}

export async function addResumeRecord(input: Omit<Resume, "id" | "uploadDate" | "isDefault"> & { uploadDate?: string; isDefault?: boolean }) {
  const hasDefault = Boolean(await db.resumes.filter((item) => item.isDefault).first());
  const record: Resume = {
    fileName: input.fileName,
    uploadDate: input.uploadDate ?? nowIso(),
    fileContent: input.fileContent,
    extractedText: input.extractedText ?? "",
    isDefault: input.isDefault ?? !hasDefault
  };

  const id = await db.resumes.add(record);
  emitDataChanged();
  return { ...record, id };
}

export async function setDefaultResume(resumeId: number) {
  const resumes = await db.resumes.toArray();
  const target = resumes.find((item) => item.id === resumeId);
  if (!target) return null;

  const updated = resumes.map((item) => ({ ...item, isDefault: item.id === resumeId }));
  await db.resumes.bulkPut(updated);
  emitDataChanged();
  return updated.find((item) => item.id === resumeId) ?? null;
}

export async function deleteResumeRecord(resumeId: number) {
  const resumes = await db.resumes.toArray();
  const target = resumes.find((item) => item.id === resumeId);
  if (!target) return;

  await db.resumes.delete(resumeId);

  if (target.isDefault) {
    const remaining = resumes.filter((item) => item.id !== resumeId);
    if (remaining.length > 0) {
      const sortedRemaining = remaining.sort((a, b) => a.uploadDate.localeCompare(b.uploadDate));
      const nextDefault = sortedRemaining[sortedRemaining.length - 1];
      if (nextDefault) {
        await db.resumes.bulkPut(remaining.map((item) => ({ ...item, isDefault: item.id === nextDefault.id })));
      }
    }
  }

  emitDataChanged();
}

export async function upsertJobDescription(applicationId: string, rawText: string, analysisResult?: string, aiAnalysis?: string, aiAnalysisResult?: string) {
  const existing = await db.jobDescriptions.where("applicationId").equals(applicationId).first();
  const timestamp = nowIso();
  const record: JobDescription = {
    id: existing?.id ?? createId("jd"),
    applicationId,
    rawText,
    analysisResult: analysisResult ?? existing?.analysisResult ?? "待分析",
    aiAnalysisResult: aiAnalysisResult ?? existing?.aiAnalysisResult ?? "",
    aiAnalysis: aiAnalysis ?? existing?.aiAnalysis ?? "",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  await db.jobDescriptions.put(record);
  emitDataChanged();
  return record;
}

export async function addResumeVersion(applicationId: string, version: string, notes: string) {
  const timestamp = nowIso();
  const record: ResumeVersion = {
    id: createId("resume-version"),
    applicationId,
    version,
    notes,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db.resumeVersions.add(record);
  emitDataChanged();
  return record;
}

export async function addPreparationItem(
  applicationId: string,
  content: string,
  options: {
    category?: PreparationCategory;
    source?: PreparationSource;
    aiQuestion?: string;
    guidance?: string;
  } = {}
) {
  const normalizedContent = content.trim();
  if (!normalizedContent) return null;

  const timestamp = nowIso();
  const record: PreparationItem = {
    id: createId("prep"),
    applicationId,
    content: normalizedContent,
    category: options.category ?? "业务理解",
    source: options.source ?? "USER_ADDED",
    status: "TODO",
    aiQuestion: options.aiQuestion?.trim() ?? "",
    guidance: options.guidance?.trim() ?? "",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db.preparationItems.add(record);
  emitDataChanged();
  return record;
}

export async function updatePreparationItem(
  itemId: string,
  input: Partial<{
    content: string;
    category: PreparationCategory;
    source: PreparationSource;
    status: PreparationItem["status"];
    aiQuestion: string;
    guidance: string;
  }>
) {
  const existing = await db.preparationItems.get(itemId);
  if (!existing) return null;

  const normalized = PreparationItemSchema.parse(existing);
  const updated: PreparationItem = {
    ...normalized,
    content: input.content?.trim() || normalized.content,
    category: input.category ?? normalized.category,
    source: input.source ?? normalized.source,
    status: input.status ?? normalized.status,
    aiQuestion: input.aiQuestion?.trim() ?? normalized.aiQuestion ?? "",
    guidance: input.guidance?.trim() ?? normalized.guidance ?? "",
    updatedAt: nowIso()
  };

  await db.preparationItems.put(updated);
  emitDataChanged();
  return updated;
}

export async function addPreparationItems(
  applicationId: string,
  items: Array<{
    content: string;
    category: PreparationCategory;
    source: PreparationSource;
    aiQuestion?: string;
    guidance?: string;
  }>
) {
  const existingItems = (await db.preparationItems.where("applicationId").equals(applicationId).toArray()).map((item) =>
    PreparationItemSchema.parse(item)
  );
  const existingContents = new Set(existingItems.map((item) => item.content));
  const timestamp = nowIso();
  const records: PreparationItem[] = [];

  for (const item of items) {
    const content = item.content.trim();
    if (!content || existingContents.has(content)) continue;

    existingContents.add(content);
    records.push({
      id: createId("prep"),
      applicationId,
      content,
      category: item.category,
      source: item.source,
      status: "TODO",
      aiQuestion: item.aiQuestion?.trim() ?? "",
      guidance: item.guidance?.trim() ?? "",
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  if (records.length === 0) return [];

  await db.preparationItems.bulkAdd(records);
  emitDataChanged();
  return records;
}

export async function togglePreparationItem(itemId: string) {
  const existing = await db.preparationItems.get(itemId);
  if (!existing) return null;

  const normalized = PreparationItemSchema.parse(existing);
  const updated: PreparationItem = {
    ...normalized,
    status: normalized.status === "MASTERED" ? "TODO" : "MASTERED",
    updatedAt: nowIso()
  };

  await db.preparationItems.put(updated);
  emitDataChanged();
  return updated;
}

export async function deletePreparationItem(itemId: string) {
  await db.preparationItems.delete(itemId);
  emitDataChanged();
}

export async function addInterviewReview(
  applicationId: string,
  input: {
    round: InterviewReview["round"];
    interviewDate: string;
    interviewer: string;
    question?: string;
    userAnswer?: string;
    qaNotes?: string;
    aiAnalysis?: InterviewReview["aiAnalysis"];
    optimizedSuggestion?: string;
    selfRating: number;
  }
) {
  const timestamp = nowIso();
  const question = input.question?.trim() ?? "";
  const userAnswer = input.userAnswer?.trim() ?? input.qaNotes?.trim() ?? "";
  const record: InterviewReview = {
    id: createId("review"),
    applicationId,
    round: input.round,
    interviewDate: input.interviewDate,
    interviewer: input.interviewer,
    question,
    userAnswer,
    qaNotes: input.qaNotes?.trim() || [question ? `问题：${question}` : "", userAnswer ? `回答：${userAnswer}` : ""].filter(Boolean).join("\n"),
    ...(input.aiAnalysis ? { aiAnalysis: input.aiAnalysis } : {}),
    optimizedSuggestion: input.optimizedSuggestion?.trim() || input.aiAnalysis?.optimizedSuggestion || "",
    selfRating: input.selfRating,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db.interviewReviews.add(record);
  emitDataChanged();
  return record;
}

export async function deleteInterviewReview(reviewId: string) {
  await db.interviewReviews.delete(reviewId);
  emitDataChanged();
}

export async function loadOfferDecisions() {
  const records = await db.offerDecisions.orderBy("createdAt").reverse().toArray();
  return records.map((record) => OfferDecisionSchema.parse(record));
}

export async function saveOfferDecision(input: Omit<OfferDecision, "id"> & { id?: number }) {
  const record: OfferDecision = {
    id: input.id,
    title: input.title,
    createdAt: input.createdAt,
    isDraft: input.isDraft ?? false,
    data: input.data
  };

  const id = await db.offerDecisions.put(record);
  emitDataChanged();
  return { ...record, id };
}

export async function deleteOfferDecisionDrafts() {
  const drafts = await db.offerDecisions.filter((decision) => decision.isDraft).toArray();
  if (drafts.length === 0) return;

  await db.offerDecisions.bulkDelete(drafts.flatMap((draft) => (draft.id === undefined ? [] : [draft.id])));
  emitDataChanged();
}

export async function deleteOfferDecision(decisionId: number) {
  await db.offerDecisions.delete(decisionId);
  emitDataChanged();
}

export async function loadTodos() {
  const records = await db.todos.orderBy("date").reverse().toArray();
  return records.map((record) => TodoSchema.parse(record));
}

export async function addTodo(input: { content: string; date: string; priority: TodoPriority }) {
  const timestamp = nowIso();
  const record: Todo = {
    id: createId("todo"),
    content: input.content.trim(),
    date: input.date,
    priority: input.priority,
    isCompleted: false,
    completedAt: "",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (!record.content) return null;

  const id = await db.todos.add(record);
  emitDataChanged();
  return { ...record, id };
}

export async function completeTodo(todoId: string | number) {
  const existing = await db.todos.get(todoId);
  if (!existing) return null;

  const timestamp = nowIso();
  const updated: Todo = {
    ...TodoSchema.parse(existing),
    isCompleted: true,
    completedAt: timestamp,
    updatedAt: timestamp
  };

  await db.todos.put(updated);
  emitDataChanged();
  return updated;
}

export async function deleteTodo(todoId: string | number) {
  await db.todos.delete(todoId);
  emitDataChanged();
}

export async function getAnalysisCache(id: string, type: string) {
  const cached = await db.analysisCache.get(id);
  return cached?.type === type ? cached : null;
}

export async function saveAnalysisCache(record: AnalysisCache) {
  await db.analysisCache.put(record);
}

export async function exportBackupData(): Promise<BackupData> {
  const [applications, resumes, jobDescriptions, resumeVersions, knowledgeItems, interviewReviews, todos, attachments, offerDecisions, analysisCache] = await Promise.all([
    db.applications.toArray(),
    db.resumes.toArray(),
    db.jobDescriptions.toArray(),
    db.resumeVersions.toArray(),
    db.preparationItems.toArray(),
    db.interviewReviews.toArray(),
    db.todos.toArray(),
    db.attachments.toArray(),
    db.offerDecisions.toArray(),
    db.analysisCache.toArray()
  ]);

  return {
    version: 1,
    exportedAt: nowIso(),
    applications,
    analysisCache,
    resumes,
    jobDescriptions,
    resumeVersions,
    knowledgeItems,
    interviewReviews,
    todos,
    attachments,
    offerDecisions
  };
}

export async function clearAllTables() {
  await db.transaction(
    "rw",
    [
      db.applications,
      db.resumes,
      db.jobDescriptions,
      db.resumeVersions,
      db.attachments,
      db.preparationItems,
      db.interviewReviews,
      db.todos,
      db.offerDecisions,
      db.analysisCache
    ],
    async () => {
      await Promise.all([
        db.applications.clear(),
        db.resumes.clear(),
        db.jobDescriptions.clear(),
        db.resumeVersions.clear(),
        db.attachments.clear(),
        db.preparationItems.clear(),
        db.interviewReviews.clear(),
        db.todos.clear(),
        db.offerDecisions.clear(),
        db.analysisCache.clear()
      ]);
    }
  );
  emitDataChanged();
}

export type BackupImportResult = {
  skipped: {
    jobDescriptions: number;
    resumeVersions: number;
    knowledgeItems: number;
    interviewReviews: number;
    attachments: number;
    todos: number;
  };
  warnings: string[];
};

export async function importBackupData(data: BackupData): Promise<BackupImportResult> {
  const applicationIds = new Set(data.applications.map((item) => item.id));
  const skipped = {
    jobDescriptions: data.jobDescriptions.filter((item) => !applicationIds.has(item.applicationId)).length,
    resumeVersions: data.resumeVersions.filter((item) => !applicationIds.has(item.applicationId)).length,
    knowledgeItems: data.knowledgeItems.filter((item) => !applicationIds.has(item.applicationId)).length,
    interviewReviews: data.interviewReviews.filter((item) => !applicationIds.has(item.applicationId)).length,
    attachments: data.attachments.filter((item) => !applicationIds.has(item.applicationId)).length,
    todos: data.todos.filter((item) => item.applicationId && !applicationIds.has(item.applicationId)).length
  };
  const warnings = Object.entries(skipped)
    .filter(([, count]) => count > 0)
    .map(([collection, count]) => `${collection} 中有 ${count} 条记录缺少对应的投递记录，已跳过`);
  const relatedJobDescriptions = data.jobDescriptions.filter((item) => applicationIds.has(item.applicationId));
  const relatedResumeVersions = data.resumeVersions.filter((item) => applicationIds.has(item.applicationId));
  const relatedKnowledgeItems = data.knowledgeItems.filter((item) => applicationIds.has(item.applicationId));
  const relatedInterviewReviews = data.interviewReviews.filter((item) => applicationIds.has(item.applicationId));
  const relatedAttachments = data.attachments.filter((item) => applicationIds.has(item.applicationId));
  const relatedTodos = data.todos.filter((item) => !item.applicationId || applicationIds.has(item.applicationId));

  await db.transaction(
    "rw",
    [
      db.applications,
      db.resumes,
      db.jobDescriptions,
      db.resumeVersions,
      db.attachments,
      db.preparationItems,
      db.interviewReviews,
      db.todos,
      db.offerDecisions,
      db.analysisCache
    ],
    async () => {
      await Promise.all([
        db.applications.clear(),
        db.resumes.clear(),
        db.jobDescriptions.clear(),
        db.resumeVersions.clear(),
        db.attachments.clear(),
        db.preparationItems.clear(),
        db.interviewReviews.clear(),
        db.todos.clear(),
        db.offerDecisions.clear(),
        db.analysisCache.clear()
      ]);

      await Promise.all([
        db.applications.bulkAdd(data.applications),
        db.resumes.bulkAdd(data.resumes ?? []),
        db.jobDescriptions.bulkAdd(relatedJobDescriptions),
        db.resumeVersions.bulkAdd(relatedResumeVersions),
        db.attachments.bulkAdd(relatedAttachments),
        db.preparationItems.bulkAdd(relatedKnowledgeItems),
        db.interviewReviews.bulkAdd(relatedInterviewReviews),
        db.todos.bulkAdd(relatedTodos),
        db.offerDecisions.bulkAdd(data.offerDecisions ?? []),
        db.analysisCache.bulkAdd(data.analysisCache ?? [])
      ]);
    }
  );
  emitDataChanged();
  return { skipped, warnings };
}
