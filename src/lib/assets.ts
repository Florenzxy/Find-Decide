import type { CareerAsset } from "../types";
import { createId, nowIso } from "./id";

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function upsertCareerAssetDraft(
  existing: CareerAsset[],
  draft: Omit<CareerAsset, "id" | "createdAt" | "updatedAt">
) {
  const normalizedTitle = normalizeText(draft.title);
  const match = existing.find((asset) => asset.type === draft.type && normalizeText(asset.title) === normalizedTitle);
  const timestamp = nowIso();

  if (match) {
    return {
      ...match,
      content: draft.content || match.content,
      tags: Array.from(new Set([...match.tags, ...draft.tags])),
      sourceApplicationId: draft.sourceApplicationId ?? match.sourceApplicationId,
      updatedAt: timestamp
    };
  }

  return {
    ...draft,
    id: createId("asset"),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
