import { describe, expect, it } from "vitest";
import { ApplicationInputSchema } from "../src/types/schema";

describe("application validation", () => {
  it("requires a valid application url", () => {
    const invalid = ApplicationInputSchema.safeParse({
      companyName: "测试公司",
      roleName: "前端工程师",
      applicationUrl: "not-a-url",
      appliedAt: "2026-08-06",
      status: "已投递"
    });

    expect(invalid.success).toBe(false);

    const valid = ApplicationInputSchema.safeParse({
      companyName: "测试公司",
      roleName: "前端工程师",
      applicationUrl: "https://example.com/job",
      appliedAt: "2026-08-06",
      status: "已投递"
    });

    expect(valid.success).toBe(true);
  });
});
