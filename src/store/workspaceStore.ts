import { create } from "zustand";
import { db, ensureDefaults, exportWorkspace, importWorkspace, clearWorkspace } from "../lib/db";
import { createId, nowIso } from "../lib/id";
import { upsertCareerAssetDraft } from "../lib/assets";
import type {
  Application,
  ApplicationStatus,
  CareerAsset,
  CareerAssetType,
  DecisionCriterion,
  InterviewRecord,
  JobDescription,
  MatchAnalysis,
  OfferOption,
  Priority,
  ResumeProfile,
  WorkspaceExport
} from "../types";

interface WorkspaceState {
  applications: Application[];
  jobDescriptions: JobDescription[];
  resumeProfiles: ResumeProfile[];
  matchAnalyses: MatchAnalysis[];
  interviewRecords: InterviewRecord[];
  careerAssets: CareerAsset[];
  offerOptions: OfferOption[];
  decisionCriteria: DecisionCriterion[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createApplication: (input: {
    company: string;
    role: string;
    status: ApplicationStatus;
    priority: Priority;
    location?: string;
    salaryRange?: string;
    notes?: string;
  }) => Promise<Application>;
  updateApplication: (id: string, patch: Partial<Application>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  saveJobDescription: (input: Omit<JobDescription, "id" | "updatedAt">) => Promise<void>;
  saveResumeProfile: (input: Omit<ResumeProfile, "id" | "updatedAt">) => Promise<void>;
  saveMatchAnalysis: (input: Omit<MatchAnalysis, "id" | "updatedAt">) => Promise<void>;
  createInterviewRecord: (input: Omit<InterviewRecord, "id" | "createdAt">) => Promise<void>;
  upsertCareerAsset: (input: Omit<CareerAsset, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  createOfferOption: (input: Pick<OfferOption, "company" | "role" | "salary" | "notes">) => Promise<void>;
  updateOfferOption: (id: string, patch: Partial<OfferOption>) => Promise<void>;
  deleteOfferOption: (id: string) => Promise<void>;
  updateCriterion: (id: string, weight: number) => Promise<void>;
  exportData: () => Promise<WorkspaceExport>;
  importData: (data: WorkspaceExport) => Promise<void>;
  clearData: () => Promise<void>;
}

async function refresh() {
  return {
    applications: await db.applications.orderBy("updatedAt").reverse().toArray(),
    jobDescriptions: await db.jobDescriptions.toArray(),
    resumeProfiles: await db.resumeProfiles.toArray(),
    matchAnalyses: await db.matchAnalyses.toArray(),
    interviewRecords: await db.interviewRecords.orderBy("createdAt").reverse().toArray(),
    careerAssets: await db.careerAssets.orderBy("updatedAt").reverse().toArray(),
    offerOptions: await db.offerOptions.orderBy("updatedAt").reverse().toArray(),
    decisionCriteria: await db.decisionCriteria.toArray()
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  applications: [],
  jobDescriptions: [],
  resumeProfiles: [],
  matchAnalyses: [],
  interviewRecords: [],
  careerAssets: [],
  offerOptions: [],
  decisionCriteria: [],
  hydrated: false,

  hydrate: async () => {
    await ensureDefaults();
    set({ ...(await refresh()), hydrated: true });
  },

  createApplication: async (input) => {
    const timestamp = nowIso();
    const application: Application = {
      ...input,
      id: createId("app"),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await db.applications.add(application);
    set({ ...(await refresh()) });
    return application;
  },

  updateApplication: async (id, patch) => {
    await db.applications.update(id, { ...patch, updatedAt: nowIso() });
    set({ ...(await refresh()) });
  },

  deleteApplication: async (id) => {
    await db.transaction(
      "rw",
      db.applications,
      db.jobDescriptions,
      db.resumeProfiles,
      db.matchAnalyses,
      db.interviewRecords,
      async () => {
        await db.applications.delete(id);
        await db.jobDescriptions.where("applicationId").equals(id).delete();
        await db.resumeProfiles.where("applicationId").equals(id).delete();
        await db.matchAnalyses.where("applicationId").equals(id).delete();
        await db.interviewRecords.where("applicationId").equals(id).delete();
      }
    );
    set({ ...(await refresh()) });
  },

  saveJobDescription: async (input) => {
    const existing = get().jobDescriptions.find((item) => item.applicationId === input.applicationId);
    const item: JobDescription = { ...input, id: existing?.id ?? createId("jd"), updatedAt: nowIso() };
    await db.jobDescriptions.put(item);
    await db.applications.update(input.applicationId, { updatedAt: nowIso() });
    set({ ...(await refresh()) });
  },

  saveResumeProfile: async (input) => {
    const existing = get().resumeProfiles.find((item) => item.applicationId === input.applicationId);
    const item: ResumeProfile = { ...input, id: existing?.id ?? createId("resume"), updatedAt: nowIso() };
    await db.resumeProfiles.put(item);
    await db.applications.update(input.applicationId, { updatedAt: nowIso() });
    set({ ...(await refresh()) });
  },

  saveMatchAnalysis: async (input) => {
    const existing = get().matchAnalyses.find((item) => item.applicationId === input.applicationId);
    const item: MatchAnalysis = { ...input, id: existing?.id ?? createId("match"), updatedAt: nowIso() };
    await db.matchAnalyses.put(item);
    await db.applications.update(input.applicationId, { updatedAt: nowIso() });
    set({ ...(await refresh()) });
  },

  createInterviewRecord: async (input) => {
    const record: InterviewRecord = { ...input, id: createId("interview"), createdAt: nowIso() };
    await db.interviewRecords.add(record);
    await db.applications.update(input.applicationId, { updatedAt: nowIso() });
    set({ ...(await refresh()) });
  },

  upsertCareerAsset: async (input) => {
    const asset = upsertCareerAssetDraft(get().careerAssets, input);
    await db.careerAssets.put(asset);
    set({ ...(await refresh()) });
  },

  createOfferOption: async (input) => {
    const timestamp = nowIso();
    const option: OfferOption = {
      ...input,
      id: createId("offer"),
      scores: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await db.offerOptions.add(option);
    set({ ...(await refresh()) });
  },

  updateOfferOption: async (id, patch) => {
    await db.offerOptions.update(id, { ...patch, updatedAt: nowIso() });
    set({ ...(await refresh()) });
  },

  deleteOfferOption: async (id) => {
    await db.offerOptions.delete(id);
    set({ ...(await refresh()) });
  },

  updateCriterion: async (id, weight) => {
    await db.decisionCriteria.update(id, { weight });
    set({ ...(await refresh()) });
  },

  exportData: exportWorkspace,

  importData: async (data) => {
    await importWorkspace(data);
    set({ ...(await refresh()), hydrated: true });
  },

  clearData: async () => {
    await clearWorkspace();
    await ensureDefaults();
    set({ ...(await refresh()), hydrated: true });
  }
}));

export function getAssetTypeForInterview(record: InterviewRecord): CareerAssetType {
  return record.question.includes("项目") ? "项目素材" : "常见面试题";
}
