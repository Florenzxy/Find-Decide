import { describe, expect, it } from "vitest";
import { calculateOfferScore, rankOffers } from "../src/lib/scoring";

describe("offer scoring", () => {
  const criteria = [
    { id: "salary", name: "薪资", weight: 20 },
    { id: "growth", name: "成长", weight: 10 }
  ];

  it("calculates weighted score", () => {
    const score = calculateOfferScore(
      {
        id: "1",
        company: "A",
        role: "前端",
        salary: "30k",
        notes: "",
        scores: {
          salary: { score: 9, reason: "" },
          growth: { score: 6, reason: "" }
        },
        createdAt: "",
        updatedAt: ""
      },
      criteria
    );

    expect(score).toBe(8);
  });

  it("ranks offers from high to low", () => {
    const ranked = rankOffers(
      [
        {
          id: "a",
          company: "A",
          role: "前端",
          salary: "30k",
          notes: "",
          scores: { salary: { score: 5, reason: "" }, growth: { score: 5, reason: "" } },
          createdAt: "",
          updatedAt: ""
        },
        {
          id: "b",
          company: "B",
          role: "前端",
          salary: "35k",
          notes: "",
          scores: { salary: { score: 9, reason: "" }, growth: { score: 9, reason: "" } },
          createdAt: "",
          updatedAt: ""
        }
      ],
      criteria
    );

    expect(ranked[0].id).toBe("b");
  });
});
