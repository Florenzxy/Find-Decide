export type ApplicationStatus =
  | "收藏"
  | "准备中"
  | "已投递"
  | "笔试"
  | "面试"
  | "offer"
  | "拒绝"
  | "归档";

export type Priority = "高" | "中" | "低";

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  priority: Priority;
  location?: string;
  salaryRange?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobDescription {
  id: string;
  applicationId: string;
  source?: string;
  rawText: string;
  responsibilities: string[];
  requirements: string[];
  updatedAt: string;
}

export interface ResumeProfile {
  id: string;
  applicationId: string;
  summary: string;
  projects: string;
  skills: string;
  achievements: string;
  updatedAt: string;
}

export interface MatchAnalysis {
  id: string;
  applicationId: string;
  score: number;
  strengths: string;
  gaps: string;
  suggestions: string;
  optimizedOutput: string;
  updatedAt: string;
}

export interface InterviewRecord {
  id: string;
  applicationId: string;
  question: string;
  answer: string;
  insight: string;
  assessedAbility: string;
  betterAnswer: string;
  weakness: string;
  nextAction: string;
  createdAt: string;
}

export type CareerAssetType = "技能点" | "项目素材" | "行业知识" | "常见面试题" | "表达模板";

export interface CareerAsset {
  id: string;
  type: CareerAssetType;
  title: string;
  content: string;
  tags: string[];
  sourceApplicationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferOption {
  id: string;
  company: string;
  role: string;
  salary: string;
  notes: string;
  scores: Record<string, { score: number; reason: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface WorkspaceExport {
  applications: Application[];
  jobDescriptions: JobDescription[];
  resumeProfiles: ResumeProfile[];
  matchAnalyses: MatchAnalysis[];
  interviewRecords: InterviewRecord[];
  careerAssets: CareerAsset[];
  offerOptions: OfferOption[];
  decisionCriteria: DecisionCriterion[];
}
