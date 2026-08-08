import { create } from "zustand";
import {
  addPreparationItem,
  type BackupImportResult,
  clearAllTables,
  db,
  exportBackupData,
  importBackupData,
  updatePreparationItem
} from "../db/db";
import { emitDataChanged } from "../lib/dataSync";
import { createId, nowIso, todayDate } from "../lib/utils";
import {
  ApplicationInputSchema,
  ApplicationSchema,
  BackupSchema,
  PreparationItemSchema,
  SelfAssessmentSchema,
  type Application,
  type ApplicationStatus,
  type PreparationItem,
  type ResumeOptimization,
  type SelfAssessment
} from "../types/schema";

export type ApplicationInput = {
  companyName: string;
  roleName: string;
  location?: string;
  applicationUrl: string;
  appliedAt?: string;
  status?: ApplicationStatus;
  selfAssessment?: SelfAssessment;
  latestAction?: string;
  notes?: string;
  resumeId?: number;
  resumeOptimizationResumeId?: number;
  resumeOptimization?: ResumeOptimization;
};

type ApplicationStore = {
  applications: Application[];
  loading: boolean;
  fetchApplications: () => Promise<void>;
  addApplication: (input: ApplicationInput) => Promise<void>;
  updateApplication: (id: string, input: Partial<ApplicationInput>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: ApplicationStatus) => Promise<void>;
  addKnowledgeItem: (
    applicationId: string,
    title: string,
    options?: {
      category?: PreparationItem["category"];
      source?: PreparationItem["source"];
      aiQuestion?: string;
      guidance?: string;
    }
  ) => Promise<PreparationItem | null>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<BackupImportResult>;
  clearAllData: () => Promise<void>;
};

function sortByAppliedAtDesc(items: Application[]) {
  return [...items].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

function normalizeCompanyNature(value?: string): SelfAssessment {
  return SelfAssessmentSchema.options.includes(value as SelfAssessment)
    ? (value as SelfAssessment)
    : "\u6c11\u8425\u4f01\u4e1a";
}

function normalizeApplication(input: ApplicationInput, id = createId("app"), createdAt = nowIso()): Application {
  const parsed = ApplicationInputSchema.parse({
    companyName: input.companyName,
    roleName: input.roleName,
    location: input.location ?? "",
    applicationUrl: input.applicationUrl,
    appliedAt: input.appliedAt ?? todayDate(),
    status: input.status ?? "已投递",
    selfAssessment: normalizeCompanyNature(input.selfAssessment),
    latestAction: input.latestAction ?? "",
    notes: input.notes ?? "",
    resumeId: input.resumeId,
    resumeOptimizationResumeId: input.resumeOptimizationResumeId,
    resumeOptimization: input.resumeOptimization
  });

  return ApplicationSchema.parse({
    ...parsed,
    id,
    createdAt,
    updatedAt: nowIso()
  });
}

function backupFileName() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `job_search_backup_${timestamp}.json`;
}

function zodErrorMessage(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const firstIssue = error.issues[0];
  if (!firstIssue) return "文件格式不正确";
  const path = firstIssue.path.length > 0 ? `${firstIssue.path.join(".")}：` : "";
  return `文件格式不正确：${path}${firstIssue.message}`;
}

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],
  loading: false,

  fetchApplications: async () => {
    set({ loading: true });
    const records = await db.applications.orderBy("appliedAt").reverse().toArray();
    set({
      applications: records.map((record) =>
        ApplicationSchema.parse({
          ...record,
          selfAssessment: normalizeCompanyNature(record.selfAssessment)
        })
      ),
      loading: false
    });
  },

  addApplication: async (input) => {
    const record = normalizeApplication(input);
    await db.applications.add(record);
    set({ applications: sortByAppliedAtDesc([record, ...get().applications]) });
    emitDataChanged();
  },

  updateApplication: async (id, input) => {
    const existing = get().applications.find((item) => item.id === id);
    if (!existing) return;

    const record = normalizeApplication(
      {
        companyName: input.companyName ?? existing.companyName,
        roleName: input.roleName ?? existing.roleName,
        location: input.location ?? existing.location,
        applicationUrl: input.applicationUrl ?? existing.applicationUrl,
        appliedAt: input.appliedAt ?? existing.appliedAt,
        status: input.status ?? existing.status,
        selfAssessment: input.selfAssessment ?? existing.selfAssessment,
        latestAction: input.latestAction ?? existing.latestAction,
        notes: input.notes ?? existing.notes,
        resumeId: input.resumeId ?? existing.resumeId,
        resumeOptimizationResumeId: input.resumeOptimizationResumeId ?? existing.resumeOptimizationResumeId,
        resumeOptimization: input.resumeOptimization ?? existing.resumeOptimization
      },
      existing.id,
      existing.createdAt
    );

    await db.applications.put(record);
    set({ applications: sortByAppliedAtDesc(get().applications.map((item) => (item.id === id ? record : item))) });
    emitDataChanged();
  },

  deleteApplication: async (id) => {
    await Promise.all([
      db.applications.delete(id),
      db.jobDescriptions.where("applicationId").equals(id).delete(),
      db.resumeVersions.where("applicationId").equals(id).delete(),
      db.attachments.where("applicationId").equals(id).delete(),
      db.preparationItems.where("applicationId").equals(id).delete(),
      db.interviewReviews.where("applicationId").equals(id).delete(),
      db.todos.where("applicationId").equals(id).delete()
    ]);
    set({ applications: get().applications.filter((item) => item.id !== id) });
    emitDataChanged();
  },

  bulkUpdateStatus: async (ids, status) => {
    const timestamp = nowIso();
    await db.applications.where("id").anyOf(ids).modify((item) => {
      item.status = status;
      item.latestAction = `批量更新为 ${status}`;
      item.updatedAt = timestamp;
    });
    set({
      applications: sortByAppliedAtDesc(
        get().applications.map((item) =>
          ids.includes(item.id) ? { ...item, status, latestAction: `批量更新为 ${status}`, updatedAt: timestamp } : item
        )
      )
    });
    emitDataChanged();
  },

  addKnowledgeItem: async (applicationId, title, options) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return null;

    const existing = await db.preparationItems
      .where("applicationId")
      .equals(applicationId)
      .filter((item) => PreparationItemSchema.parse(item).content === normalizedTitle)
      .first();

    if (existing) {
      const parsed = PreparationItemSchema.parse(existing);
      if (options?.aiQuestion?.trim() || options?.guidance?.trim()) {
        const updated = await updatePreparationItem(parsed.id, {
          category: options.category ?? parsed.category,
          source: options.source ?? parsed.source,
          aiQuestion: options.aiQuestion ?? parsed.aiQuestion,
          guidance: options.guidance ?? parsed.guidance
        });
        return updated ?? parsed;
      }

      return parsed;
    }

    return addPreparationItem(applicationId, normalizedTitle, {
      category: options?.category ?? "技能考察",
      source: options?.source ?? "AI_GENERATED",
      aiQuestion: options?.aiQuestion,
      guidance: options?.guidance
    });
  },

  exportData: async () => {
    set({ loading: true });
    try {
      const data = BackupSchema.parse(await exportBackupData());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = backupFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      set({ loading: false });
    }
  },

  importData: async (file) => {
    set({ loading: true });
    try {
      let json: unknown;

      try {
        json = JSON.parse(await file.text());
      } catch {
        throw new Error("文件格式不正确：请上传有效的 JSON 文件");
      }

      const result = BackupSchema.safeParse(json);
      if (!result.success) {
        throw new Error(zodErrorMessage(result.error));
      }

      const importResult = await importBackupData(result.data);
      const records = await db.applications.orderBy("appliedAt").reverse().toArray();
      set({ applications: records.map((record) => ApplicationSchema.parse(record)) });
      return importResult;
    } finally {
      set({ loading: false });
    }
  },

  clearAllData: async () => {
    set({ loading: true });
    try {
      await clearAllTables();
      set({ applications: [] });
    } finally {
      set({ loading: false });
    }
  }
}));
