import { describe, expect, it } from "vitest";
import { upsertCareerAssetDraft } from "../src/lib/assets";

describe("career asset upsert", () => {
  it("merges duplicate assets by type and title", () => {
    const existing = [
      {
        id: "asset_1",
        type: "技能点" as const,
        title: "React 性能优化",
        content: "A",
        tags: ["react"],
        createdAt: "1",
        updatedAt: "1"
      }
    ];

    const result = upsertCareerAssetDraft(existing, {
      type: "技能点",
      title: "react 性能优化",
      content: "B",
      tags: ["hooks"],
      sourceApplicationId: "app_1"
    });

    expect(result.id).toBe("asset_1");
    expect(result.tags).toEqual(expect.arrayContaining(["react", "hooks"]));
    expect(result.content).toBe("B");
  });
});
