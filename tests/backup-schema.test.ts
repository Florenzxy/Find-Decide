import { describe, expect, it } from "vitest";
import { BackupSchema } from "../src/types/schema";

const baseBackup = {
  version: 1,
  exportedAt: "2026-08-06T00:00:00.000Z",
  applications: [
    {
      id: "app_1",
      companyName: "测试公司",
      roleName: "前端工程师",
      location: "上海",
      applicationUrl: "https://example.com/job",
      appliedAt: "2026-08-06",
      status: "已投递",
      latestAction: "新建投递",
      notes: "",
      createdAt: "2026-08-06T00:00:00.000Z",
      updatedAt: "2026-08-06T00:00:00.000Z"
    }
  ],
  jobDescriptions: [],
  resumeVersions: [],
  knowledgeItems: [],
  interviewReviews: [],
  todos: [],
  attachments: []
};

describe("backup schema", () => {
  it("accepts a complete backup file", () => {
    expect(BackupSchema.safeParse(baseBackup).success).toBe(true);
  });

  it("accepts related records without an application for import-time repair", () => {
    const result = BackupSchema.safeParse({
      ...baseBackup,
      knowledgeItems: [
        {
          id: "prep_1",
          applicationId: "missing_app",
          title: "复习 React Hooks",
          completed: false,
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z"
        }
      ]
    });

    expect(result.success).toBe(true);
  });
});
