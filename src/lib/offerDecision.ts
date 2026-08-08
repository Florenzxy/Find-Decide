import type { OfferDecisionData, OfferDecisionOption } from "../types/schema";

export function calculateOfferTotal(data: OfferDecisionData, option: OfferDecisionOption) {
  return data.factors.reduce((total, factor) => {
    return total + (option.scores[factor.id] ?? 0) * factor.weight;
  }, 0);
}

export function findWinningOptionId(data: OfferDecisionData) {
  return data.options.reduce<string | null>((winnerId, option) => {
    if (!winnerId) return option.id;

    const winner = data.options.find((item) => item.id === winnerId);
    if (!winner) return option.id;

    return calculateOfferTotal(data, option) > calculateOfferTotal(data, winner) ? option.id : winnerId;
  }, null);
}
