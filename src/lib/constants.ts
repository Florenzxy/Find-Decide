import type { ApplicationStatus, CareerAssetType, DecisionCriterion, Priority } from "../types";

export const applicationStatuses: ApplicationStatus[] = [
  "收藏",
  "准备中",
  "已投递",
  "笔试",
  "面试",
  "offer",
  "拒绝",
  "归档"
];

export const priorities: Priority[] = ["高", "中", "低"];

export const assetTypes: CareerAssetType[] = ["技能点", "项目素材", "行业知识", "常见面试题", "表达模板"];

export const defaultDecisionCriteria: DecisionCriterion[] = [
  { id: "salary", name: "薪资", weight: 20 },
  { id: "growth", name: "成长", weight: 20 },
  { id: "platform", name: "平台", weight: 15 },
  { id: "stability", name: "稳定性", weight: 15 },
  { id: "city", name: "城市", weight: 10 },
  { id: "team", name: "团队", weight: 10 },
  { id: "interest", name: "兴趣", weight: 5 },
  { id: "risk", name: "风险", weight: 5 }
];
