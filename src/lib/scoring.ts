import type { DecisionCriterion, OfferOption } from "../types";

export function calculateOfferScore(option: OfferOption, criteria: DecisionCriterion[]) {
  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;

  const weighted = criteria.reduce((sum, item) => {
    const score = option.scores[item.id]?.score ?? 0;
    return sum + score * item.weight;
  }, 0);

  return Math.round((weighted / totalWeight) * 10) / 10;
}

export function rankOffers(options: OfferOption[], criteria: DecisionCriterion[]) {
  return [...options].sort((a, b) => calculateOfferScore(b, criteria) - calculateOfferScore(a, criteria));
}
