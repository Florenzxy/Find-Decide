import { describe, expect, it } from "vitest";
import { calculateOfferTotal, findWinningOptionId } from "../src/lib/offerDecision";
import type { OfferDecisionData } from "../src/types/schema";

describe("offer decision scoring", () => {
  it("calculates weighted totals and finds the winner", () => {
    const data: OfferDecisionData = {
      factors: [
        { id: "salary", name: "Salary", weight: 5 },
        { id: "growth", name: "Growth", weight: 2 }
      ],
      options: [
        { id: "a", name: "Company A", scores: { salary: 8, growth: 5 } },
        { id: "b", name: "Company B", scores: { salary: 6, growth: 8 } }
      ]
    };

    expect(calculateOfferTotal(data, data.options[0])).toBe(50);
    expect(calculateOfferTotal(data, data.options[1])).toBe(46);
    expect(findWinningOptionId(data)).toBe("a");
  });
});
