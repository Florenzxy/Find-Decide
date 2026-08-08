import { beforeEach, describe, expect, it } from "vitest";
import { clearWorkspace, db, ensureDefaults, exportWorkspace, importWorkspace } from "../src/lib/db";

describe("workspace db", () => {
  beforeEach(async () => {
    await clearWorkspace();
  });

  it("loads default decision criteria", async () => {
    await ensureDefaults();
    expect(await db.decisionCriteria.count()).toBeGreaterThan(0);
  });

  it("exports and imports workspace data", async () => {
    await db.applications.add({
      id: "app_1",
      company: "Acme",
      role: "前端",
      status: "准备中",
      priority: "中",
      createdAt: "1",
      updatedAt: "1"
    });

    const exported = await exportWorkspace();
    await clearWorkspace();
    await importWorkspace(exported);

    expect(await db.applications.count()).toBe(1);
  });
});
