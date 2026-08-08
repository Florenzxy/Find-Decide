import Dexie, { type Table } from "dexie";
import type {
  Application,
  CareerAsset,
  DecisionCriterion,
  InterviewRecord,
  JobDescription,
  MatchAnalysis,
  OfferOption,
  ResumeProfile,
  WorkspaceExport
} from "../types";
import { defaultDecisionCriteria } from "./constants";

class WorkspaceDatabase extends Dexie {
  applications!: Table<Application, string>;
  jobDescriptions!: Table<JobDescription, string>;
  resumeProfiles!: Table<ResumeProfile, string>;
  matchAnalyses!: Table<MatchAnalysis, string>;
  interviewRecords!: Table<InterviewRecord, string>;
  careerAssets!: Table<CareerAsset, string>;
  offerOptions!: Table<OfferOption, string>;
  decisionCriteria!: Table<DecisionCriterion, string>;

  constructor() {
    super("find-a-decide-workspace");
    this.version(1).stores({
      applications: "id, company, role, status, priority, updatedAt",
      jobDescriptions: "id, applicationId, updatedAt",
      resumeProfiles: "id, applicationId, updatedAt",
      matchAnalyses: "id, applicationId, updatedAt",
      interviewRecords: "id, applicationId, createdAt",
      careerAssets: "id, type, title, sourceApplicationId, updatedAt",
      offerOptions: "id, company, updatedAt",
      decisionCriteria: "id, name"
    });
  }
}

export const db = new WorkspaceDatabase();

export async function ensureDefaults() {
  const count = await db.decisionCriteria.count();
  if (count === 0) {
    await db.decisionCriteria.bulkPut(defaultDecisionCriteria);
  }
}

export async function exportWorkspace(): Promise<WorkspaceExport> {
  return {
    applications: await db.applications.toArray(),
    jobDescriptions: await db.jobDescriptions.toArray(),
    resumeProfiles: await db.resumeProfiles.toArray(),
    matchAnalyses: await db.matchAnalyses.toArray(),
    interviewRecords: await db.interviewRecords.toArray(),
    careerAssets: await db.careerAssets.toArray(),
    offerOptions: await db.offerOptions.toArray(),
    decisionCriteria: await db.decisionCriteria.toArray()
  };
}

export async function importWorkspace(data: WorkspaceExport) {
  await clearWorkspace();
  await db.applications.bulkPut(data.applications ?? []);
  await db.jobDescriptions.bulkPut(data.jobDescriptions ?? []);
  await db.resumeProfiles.bulkPut(data.resumeProfiles ?? []);
  await db.matchAnalyses.bulkPut(data.matchAnalyses ?? []);
  await db.interviewRecords.bulkPut(data.interviewRecords ?? []);
  await db.careerAssets.bulkPut(data.careerAssets ?? []);
  await db.offerOptions.bulkPut(data.offerOptions ?? []);
  await db.decisionCriteria.bulkPut(data.decisionCriteria?.length ? data.decisionCriteria : defaultDecisionCriteria);
}

export async function clearWorkspace() {
  await Promise.all([
    db.applications.clear(),
    db.jobDescriptions.clear(),
    db.resumeProfiles.clear(),
    db.matchAnalyses.clear(),
    db.interviewRecords.clear(),
    db.careerAssets.clear(),
    db.offerOptions.clear(),
    db.decisionCriteria.clear()
  ]);
}
