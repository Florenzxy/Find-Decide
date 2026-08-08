import { beforeEach, describe, expect, it } from "vitest";
import { clearAllTables, db, exportBackupData, importBackupData } from "../src/db/db";
import { BackupSchema } from "../src/types/schema";

const application = {
  id: "app_1",
  companyName: "测试公司",
  roleName: "产品经理",
  location: "上海",
  applicationUrl: "https://example.com/job",
  appliedAt: "2026-08-08",
  status: "已投递",
  selfAssessment: "民营企业",
  latestAction: "",
  notes: "",
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z"
} as const;

function backupWithOrphans() {
  return BackupSchema.parse({
    version: 1,
    exportedAt: "2026-08-08T00:00:00.000Z",
    applications: [application],
    resumes: [],
    jobDescriptions: [],
    resumeVersions: [],
    knowledgeItems: [
      {
        id: "prep_valid",
        applicationId: "app_1",
        content: "SQL",
        category: "技能考察",
        source: "USER_ADDED",
        status: "TODO",
        aiQuestion: "",
        guidance: "",
        createdAt: "2026-08-08T00:00:00.000Z",
        updatedAt: "2026-08-08T00:00:00.000Z"
      },
      {
        id: "prep_orphan",
        applicationId: "missing_app",
        content: "孤立知识点",
        category: "业务理解",
        source: "USER_ADDED",
        status: "TODO",
        aiQuestion: "",
        guidance: "",
        createdAt: "2026-08-08T00:00:00.000Z",
        updatedAt: "2026-08-08T00:00:00.000Z"
      }
    ],
    interviewReviews: [
      {
        id: "review_orphan",
        applicationId: "missing_app",
        round: "一面",
        interviewDate: "2026-08-08",
        interviewer: "",
        question: "问题",
        userAnswer: "回答",
        qaNotes: "",
        selfRating: 3,
        createdAt: "2026-08-08T00:00:00.000Z",
        updatedAt: "2026-08-08T00:00:00.000Z"
      }
    ],
    todos: [
      {
        id: "todo_orphan",
        applicationId: "missing_app",
        content: "孤立待办",
        date: "2026-08-08",
        priority: "NORMAL",
        isCompleted: false,
        completedAt: "",
        createdAt: "2026-08-08T00:00:00.000Z",
        updatedAt: "2026-08-08T00:00:00.000Z"
      }
    ],
    attachments: [],
    offerDecisions: [],
    analysisCache: []
  });
}

describe("backup database operations", () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  it("exports every backup collection", async () => {
    const data = await exportBackupData();

    expect(Object.keys(data).sort()).toEqual([
      "analysisCache",
      "applications",
      "attachments",
      "exportedAt",
      "interviewReviews",
      "jobDescriptions",
      "knowledgeItems",
      "offerDecisions",
      "resumeVersions",
      "resumes",
      "todos",
      "version"
    ]);
  });

  it("imports with orphaned application references without aborting", async () => {
    const result = await importBackupData(backupWithOrphans());

    expect(result.skipped.knowledgeItems).toBe(1);
    expect(result.skipped.interviewReviews).toBe(1);
    expect(result.skipped.todos).toBe(1);
    expect(await db.preparationItems.count()).toBe(1);
    expect(await db.interviewReviews.count()).toBe(0);
    expect(await db.todos.count()).toBe(0);
  });

  it("clears every Dexie table", async () => {
    await importBackupData(
      BackupSchema.parse({
        ...backupWithOrphans(),
        knowledgeItems: [],
        interviewReviews: [],
        todos: []
      })
    );

    await clearAllTables();

    const counts = await Promise.all([
      db.applications.count(),
      db.resumes.count(),
      db.jobDescriptions.count(),
      db.resumeVersions.count(),
      db.attachments.count(),
      db.preparationItems.count(),
      db.interviewReviews.count(),
      db.todos.count(),
      db.offerDecisions.count(),
      db.analysisCache.count()
    ]);
    expect(counts.every((count) => count === 0)).toBe(true);
  });
});
