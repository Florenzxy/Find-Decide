import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, FileText, Lightbulb, Plus, Save, Search, Sparkles, Star, Target, Trash2 } from "lucide-react";
import {
  addInterviewReview,
  addPreparationItem,
  addPreparationItems,
  deleteInterviewReview,
  deletePreparationItem,
  loadApplicationDetail,
  loadResumes,
  togglePreparationItem,
  updatePreparationItem,
  upsertJobDescription
} from "../db/db";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "../components/Tabs";
import { Modal } from "../components/Modal";
import { Badge, Button, Input, Select, Textarea } from "../components/ui";
import {
  analyzeJobDescription,
  analyzeInterviewReview,
  analyzeResumeOptimization,
  generatePreparationStrategyStrict,
  parseJobDescriptionAnalysis,
  type InterviewReviewAiAnalysis,
  type JobDescriptionAnalysis
} from "../services/aiService";
import { useApplicationStore } from "../store/useApplicationStore";
import { cn, todayDate } from "../lib/utils";
import { ResumeOptimizationSchema, SelfAssessmentSchema } from "../types/schema";
import type {
  Application,
  InterviewReview,
  JobDescription,
  PreparationCategory,
  PreparationItem,
  Resume,
  ResumeOptimization,
  SelfAssessment
} from "../types/schema";

type TabKey = "JD 分析" | "简历优化" | "知识准备" | "面试复盘";

const tabs: TabKey[] = ["JD 分析", "简历优化", "知识准备", "面试复盘"];
const interviewRounds: InterviewReview["round"][] = ["HR面", "一面", "二面", "三面", "终面", "其他"];
const preparationCategories: PreparationCategory[] = ["业务理解", "技能考察", "项目深挖"];
const prepCategoryTabs: Array<{ value: PreparationCategory; label: string; badge: string; tone: string }> = [
  { value: "业务理解", label: "🏢业务理解", badge: "#业务", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "技能考察", label: "🛠️技能考察", badge: "#技能", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "项目深挖", label: "💼项目深挖", badge: "#项目", tone: "border-violet-200 bg-violet-50 text-violet-700" }
];
const defaultCompanyNature: SelfAssessment = "\u6c11\u8425\u4f01\u4e1a";

function normalizeCompanyNature(value?: string): SelfAssessment {
  return SelfAssessmentSchema.options.includes(value as SelfAssessment) ? (value as SelfAssessment) : defaultCompanyNature;
}

function companyNatureBadgeClass(value: SelfAssessment) {
  switch (value) {
    case "\u4e8b\u4e1a\u5355\u4f4d":
    case "\u592e\u56fd\u4f01":
      return "bg-emerald-100 text-emerald-700";
    case "\u5916\u4f01":
    case "\u4e2d\u5916\u5408\u8d44/\u6e2f\u6fb3\u5408\u8d44":
      return "bg-sky-100 text-sky-700";
    case "\u516c\u76ca\u7ec4\u7ec7/\u793e\u4f1a\u56e2\u4f53":
      return "bg-violet-100 text-violet-700";
    case "\u80a1\u4efd/\u96c6\u4f53/\u6df7\u5408/\u5176\u4ed6\u6027\u8d28":
      return "bg-slate-100 text-slate-700";
    case "\u6c11\u8425\u4f01\u4e1a":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function emptyText(value: string | null | undefined) {
  return value?.trim() || "未提及";
}

function keywordBadgeClass(weight: 1 | 2 | 3) {
  switch (weight) {
    case 3:
      return "border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm text-emerald-800";
    case 2:
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function toStrategyCategory(category: PreparationCategory): "business" | "skill" | "project" {
  switch (category) {
    case "业务理解":
      return "business";
    case "技能考察":
      return "skill";
    default:
      return "project";
  }
}

function toPreparationCategory(category: "business" | "skill" | "project"): PreparationCategory {
  switch (category) {
    case "business":
      return "业务理解";
    case "skill":
      return "技能考察";
    default:
      return "项目深挖";
  }
}

function buildAnalysisMarkdown(analysis: JobDescriptionAnalysis) {
  return [
    "## AI 洞察",
    "",
    "### 硬性门槛",
    `- 学历要求：${analysis.mustHave.education || "未提及"}`,
    `- 经验要求：${analysis.mustHave.experience || "未提及"}`,
    `- 语言要求：${analysis.mustHave.language || "未提及"}`,
    `- 必备技能：${analysis.mustHave.requiredSkills.join("、") || "无"}`,
    `- 必备证书：${analysis.mustHave.requiredCerts.join("、") || "无"}`,
    "",
    "### 加分项",
    `- 加分技能：${analysis.niceToHave.preferredSkills.join("、") || "无"}`,
    `- 加分经验：${analysis.niceToHave.preferredExperience.join("、") || "无"}`,
    `- 加分证书：${analysis.niceToHave.preferredCerts.join("、") || "无"}`,
    "",
    "### 核心关键词",
    analysis.keywords.map((item) => `- ${item.word}（权重 ${item.weight}）`).join("\n"),
    "",
    "### 风险点",
    analysis.riskPoints.map((item) => `- ${item.label}`).join("\n"),
    "",
    "### 岗位画像",
    analysis.profile
  ].join("\n");
}

function parseSavedAnalysis(jobDescription: JobDescription | null): JobDescriptionAnalysis | null {
  return parseJobDescriptionAnalysis(jobDescription?.aiAnalysisResult || jobDescription?.aiAnalysis);
}

function getReviewQuestion(review: InterviewReview) {
  if (review.question.trim()) return review.question;
  const legacyQuestion = review.qaNotes.match(/问题：([\s\S]*?)(?:\n回答：|$)/)?.[1]?.trim();
  return legacyQuestion || "未拆分记录的问题";
}

function getReviewAnswer(review: InterviewReview) {
  if (review.userAnswer.trim()) return review.userAnswer;
  const legacyAnswer = review.qaNotes.match(/回答：([\s\S]*)$/)?.[1]?.trim();
  return legacyAnswer || review.qaNotes || "未填写回答";
}

function RatingStars({
  value,
  onChange,
  readonly = false
}: {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`自我评分 ${value} 星`}>
      {[1, 2, 3, 4, 5].map((score) => {
        const active = score <= value;
        if (readonly) {
          return (
            <Star key={score} size={18} className={cn(active ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          );
        }

        return (
          <button
            key={score}
            type="button"
            className={cn("rounded-md p-1", active ? "text-amber-400" : "text-slate-300 hover:text-amber-300")}
            aria-label={`${score} 星`}
            onClick={() => onChange?.(score)}
          >
            <Star size={20} className={active ? "fill-amber-400" : ""} />
          </button>
        );
      })}
    </div>
  );
}

export function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const addKnowledgeItem = useApplicationStore((state) => state.addKnowledgeItem);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const [activeTab, setActiveTab] = useState<TabKey>("JD 分析");
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();
  const [analysisResumeId, setAnalysisResumeId] = useState<number | undefined>();
  const [resumeOptimization, setResumeOptimization] = useState<ResumeOptimization | null>(null);
  const [preparationItems, setPreparationItems] = useState<PreparationItem[]>([]);
  const [interviewReviews, setInterviewReviews] = useState<InterviewReview[]>([]);
  const [notice, setNotice] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<JobDescriptionAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [optimizationError, setOptimizationError] = useState("");
  const [skillFeedback, setSkillFeedback] = useState<Record<string, boolean>>({});
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState("");
  const [strategyConfirmOpen, setStrategyConfirmOpen] = useState(false);
  const [expandedPreparationItemId, setExpandedPreparationItemId] = useState<string | null>(null);
  const [activePreparationCategory, setActivePreparationCategory] = useState<PreparationCategory>("业务理解");

  const [jdText, setJdText] = useState("");
  const [preparationTitle, setPreparationTitle] = useState("");
  const [preparationCategory, setPreparationCategory] = useState<PreparationCategory>("业务理解");
  const [reviewForm, setReviewForm] = useState({
    round: "一面" as InterviewReview["round"],
    interviewDate: todayDate(),
    interviewer: "",
    question: "",
    userAnswer: "",
    selfRating: 3
  });
  const [reviewAiAnalysis, setReviewAiAnalysis] = useState<InterviewReviewAiAnalysis | null>(null);
  const [reviewAiLoading, setReviewAiLoading] = useState(false);
  const [reviewAiError, setReviewAiError] = useState("");
  const [selectedReview, setSelectedReview] = useState<InterviewReview | null>(null);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<InterviewReview | null>(null);

  const refreshDetail = useCallback(async () => {
    if (!applicationId) {
      setApplication(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [detail, availableResumes] = await Promise.all([loadApplicationDetail(applicationId), loadResumes()]);
    setApplication(detail.application);
    setJobDescription(detail.jobDescription);
    setJdText(detail.jobDescription?.rawText ?? "");
    setResumes(availableResumes);
    const persistedOptimization = detail.application?.resumeOptimization;
    const normalizedOptimization = persistedOptimization
      ? ResumeOptimizationSchema.parse(persistedOptimization)
      : null;
    setResumeOptimization(normalizedOptimization);
    const persistedResumeId = detail.application?.resumeId;
    const persistedAnalysisResumeId =
      detail.application?.resumeOptimizationResumeId ?? detail.application?.resumeId;
    const fallbackResumeId =
      availableResumes.find((resume) => resume.id === persistedResumeId)?.id ??
      availableResumes.find((resume) => resume.isDefault)?.id ??
      availableResumes[0]?.id;
    setSelectedResumeId(fallbackResumeId);
    setAnalysisResumeId(
      availableResumes.find((resume) => resume.id === persistedAnalysisResumeId)?.id ??
        availableResumes.find((resume) => resume.id === fallbackResumeId)?.id ??
        availableResumes.find((resume) => resume.isDefault)?.id ??
        availableResumes[0]?.id
    );
    setPreparationItems(detail.preparationItems);
    setInterviewReviews(detail.interviewReviews);
    setAiAnalysis(parseSavedAnalysis(detail.jobDescription));
    setAiError("");
    setOptimizationError("");
    setLoading(false);
  }, [applicationId]);

  useEffect(() => {
    void refreshDetail();
  }, [refreshDetail]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1600);
  }

  async function handleSaveJd() {
    if (!applicationId) return;
    const saved = await upsertJobDescription(applicationId, jdText);
    setJobDescription(saved);
    showNotice("JD 已保存");
  }

  async function handleAnalyzeJd() {
    if (!jdText.trim()) {
      setAiError("请先粘贴职位描述哦");
      return;
    }

    setAiError("");
    setAiLoading(true);
    try {
      const result = await analyzeJobDescription(jdText);
      setAiAnalysis(result);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "AI 智能分析失败");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveAiAnalysis() {
    if (!applicationId || !aiAnalysis) return;

    const markdown = buildAnalysisMarkdown(aiAnalysis);
    const saved = await upsertJobDescription(applicationId, jdText, jobDescription?.analysisResult, markdown, JSON.stringify(aiAnalysis));
    setJobDescription(saved);
    showNotice("AI 洞察已保存");
  }

  async function handleAddSkill(skill: string) {
    if (!applicationId || !skill.trim()) return;
    if (preparationItems.some((item) => item.content === skill)) return;

    const added = await addKnowledgeItem(applicationId, skill, {
      category: "技能考察",
      source: "AI_GENERATED"
    });
    if (!added) return;

    setPreparationItems((current) => (current.some((item) => item.id === added.id) ? current : [added, ...current]));
    setSkillFeedback((current) => ({ ...current, [skill]: true }));
    window.setTimeout(() => {
      setSkillFeedback((current) => ({ ...current, [skill]: false }));
    }, 1200);
    showNotice(`${skill} 已加入知识准备`);
  }

  async function handleResumeChange(resumeId: number) {
    if (!applicationId) return;

    setSelectedResumeId(resumeId);
    await updateApplication(applicationId, { resumeId });
    setApplication((current) => (current ? { ...current, resumeId } : current));
    showNotice("已更换关联简历");
  }

  async function handleAnalyzeResumeOptimization() {
    const jdSource = jobDescription?.rawText.trim();
    if (!jdSource) {
      setOptimizationError("请先在“JD 分析”中保存岗位原文");
      return;
    }
    if (selectedResumeId === undefined) {
      setOptimizationError("请先上传或选择一份简历");
      return;
    }
    if (!selectedResume) {
      setOptimizationError("没有找到当前关联的简历，请重新选择");
      return;
    }
    if (!selectedResume.extractedText?.trim()) {
      setOptimizationError("当前简历尚未提取正文，请重新上传该 PDF 后再分析。");
      return;
    }

    setOptimizationError("");
    setOptimizationLoading(true);
    try {
      const result = await analyzeResumeOptimization(jdSource, selectedResume.extractedText, aiAnalysis);
      await updateApplication(applicationId!, {
        resumeId: selectedResumeId,
        resumeOptimizationResumeId: selectedResumeId,
        resumeOptimization: result
      });
      setResumeOptimization(result);
      setAnalysisResumeId(selectedResumeId);
      setApplication((current) =>
        current
          ? {
              ...current,
              resumeId: selectedResumeId,
              resumeOptimizationResumeId: selectedResumeId,
              resumeOptimization: result
            }
          : current
      );
      showNotice("简历优化分析已保存");
    } catch (caught) {
      setOptimizationError(caught instanceof Error ? caught.message : "简历优化分析失败");
    } finally {
      setOptimizationLoading(false);
    }
  }

  async function handleAddPreparationItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!applicationId || !preparationTitle.trim()) return;

    await addPreparationItem(applicationId, preparationTitle.trim(), {
      category: preparationCategory,
      source: "USER_ADDED"
    });
    setPreparationTitle("");
    await refreshDetail();
    showNotice("知识准备条目已添加");
  }

  function handleRequestGeneratePreparationStrategy() {
    if (!applicationId) return;

    if (!aiAnalysis) {
      setStrategyError("请先完成“JD 分析”");
      return;
    }

    if (!resumeOptimization) {
      setStrategyError("请先完成“简历优化”分析");
      return;
    }

    const resumeForAnalysis = analysisResumeId ? resumes.find((resume) => resume.id === analysisResumeId) : undefined;
    if (!resumeForAnalysis?.extractedText?.trim()) {
      setStrategyError("请先使用已分析的简历生成知识准备，或重新进行简历优化分析。");
      return;
    }

    setStrategyError("");
    setStrategyConfirmOpen(true);
  }

  async function handleGeneratePreparationStrategy() {
    if (!applicationId) return;

    if (!aiAnalysis) {
      setStrategyError("请先完成“JD 分析”");
      return;
    }

    if (!resumeOptimization) {
      setStrategyError("请先完成“简历优化”分析");
      return;
    }

    const resumeForAnalysis = analysisResumeId ? resumes.find((resume) => resume.id === analysisResumeId) : undefined;
    if (!resumeForAnalysis?.extractedText?.trim()) {
      setStrategyError("请先使用已分析的简历生成知识准备，或重新进行简历优化分析。");
      return;
    }

    setStrategyError("");
    setStrategyLoading(true);
    try {
      const existingKnowledgeItems = preparationItems.map((item) => ({
        knowledgePoint: item.content,
        category: toStrategyCategory(item.category)
      }));
      const generatedItems = await generatePreparationStrategyStrict(
        aiAnalysis,
        resumeOptimization,
        analysisResume?.extractedText ?? "",
        analysisResume?.fileName ?? "",
        existingKnowledgeItems
      );
      const existingByContent = new Map(preparationItems.map((item) => [item.content.trim(), item]));
      const itemsToAdd = generatedItems.filter((item) => !existingByContent.has(item.knowledgePoint.trim()));
      const itemsToUpdate = generatedItems.flatMap((item) => {
        const existing = existingByContent.get(item.knowledgePoint.trim());
        return existing ? [{ existing, generated: item }] : [];
      });

      await Promise.all(
        itemsToUpdate.map(({ existing, generated }) =>
          updatePreparationItem(existing.id, {
            aiQuestion: generated.question,
            guidance: generated.guidance
          })
        )
      );
      const addedItems = await addPreparationItems(
        applicationId,
        itemsToAdd.map((item) => ({
          content: item.knowledgePoint,
          category: toPreparationCategory(item.category),
          source: "AI_GENERATED" as const,
          aiQuestion: item.question,
          guidance: item.guidance
        }))
      );
      setActivePreparationCategory("业务理解");
      await refreshDetail();
      showNotice(`已更新 ${itemsToUpdate.length} 条，新增 ${addedItems.length} 条 AI 备战清单`);
    } catch (caught) {
      setStrategyError(caught instanceof Error ? caught.message : "生成 AI 备战策略失败");
    } finally {
      setStrategyLoading(false);
    }
  }

  async function handleTogglePreparationItem(itemId: string) {
    await togglePreparationItem(itemId);
    await refreshDetail();
  }

  async function handleDeletePreparationItem(itemId: string) {
    await deletePreparationItem(itemId);
    await refreshDetail();
  }

  async function handleAnalyzeInterviewReview() {
    const jdSource = jobDescription?.rawText.trim() || jdText.trim();
    if (!jdSource) {
      setReviewAiError("请先保存当前岗位的 JD，再进行 AI 深度解析。");
      return;
    }
    if (!reviewForm.question.trim() || !reviewForm.userAnswer.trim()) {
      setReviewAiError("请先填写面试问题和我的回答。");
      return;
    }

    setReviewAiError("");
    setReviewAiLoading(true);
    try {
      const result = await analyzeInterviewReview(jdSource, reviewForm.question, reviewForm.userAnswer);
      setReviewAiAnalysis(result);
    } catch (caught) {
      setReviewAiError(caught instanceof Error ? caught.message : "AI 深度解析失败");
    } finally {
      setReviewAiLoading(false);
    }
  }

  async function handleAddInterviewReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!applicationId) return;
    await addInterviewReview(applicationId, {
      ...reviewForm,
      aiAnalysis: reviewAiAnalysis ?? undefined,
      optimizedSuggestion: reviewAiAnalysis?.optimizedSuggestion
    });
    setReviewForm({
      round: "一面",
      interviewDate: todayDate(),
      interviewer: "",
      question: "",
      userAnswer: "",
      selfRating: 3
    });
    setReviewAiAnalysis(null);
    setReviewAiError("");
    await refreshDetail();
    showNotice("面试复盘已添加");
  }

  async function handleDeleteInterviewReview() {
    if (!deleteReviewTarget) return;

    await deleteInterviewReview(deleteReviewTarget.id);
    if (selectedReview?.id === deleteReviewTarget.id) {
      setSelectedReview(null);
    }
    setDeleteReviewTarget(null);
    await refreshDetail();
    showNotice("面试复盘已删除");
  }

  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId);
  const analysisResume = resumes.find((resume) => resume.id === analysisResumeId);
  const sortedJdKeywords = [...(aiAnalysis?.keywords ?? [])].sort((a, b) => b.weight - a.weight);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">正在加载岗位工作台...</div>;
  }

  if (!application) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">404 未找到</p>
        <h2 className="mt-2 text-2xl font-semibold">没有找到这条投递记录</h2>
        <p className="mt-2 text-sm text-slate-600">它可能已经被删除，或者链接里的 ID 不存在。</p>
        <Link
          to="/applications"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white"
        >
          <ArrowLeft size={16} />
          返回列表页
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">岗位工作台</p>
          <h2 className="mt-1 text-2xl font-semibold">
            {application.companyName} / {application.roleName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge className="bg-slate-100 text-slate-700">{application.status}</Badge>
            <Badge className={cn("whitespace-nowrap", companyNatureBadgeClass(normalizeCompanyNature(application.selfAssessment)))}>
              {"\u4f01\u4e1a\u6027\u8d28\uff1a"}
              {normalizeCompanyNature(application.selfAssessment)}
            </Badge>
            <span>{application.location || "地点未填写"}</span>
            <span>投递日期：{application.appliedAt}</span>
          </div>
        </div>
        <Link
          to="/applications"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          返回列表
        </Link>
      </header>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <Tabs>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} currentValue={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsPanel value="JD 分析" currentValue={activeTab}>
          <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-700">JD 原文</h3>
                <Button onClick={handleSaveJd}>
                  <Save size={16} />
                  保存
                </Button>
              </div>
              <Textarea
                aria-label="JD 原文"
                rows={12}
                className="text-sm leading-6"
                placeholder="把岗位 JD 原文粘贴到这里。AI 分析接口下一阶段接入。"
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={handleAnalyzeJd} disabled={aiLoading}>
                  <Sparkles size={16} />
                  {aiLoading ? "正在分析中..." : "✨ AI 智能分析"}
                </Button>
                <Button variant="secondary" onClick={handleSaveAiAnalysis} disabled={!aiAnalysis || aiLoading}>
                  <Lightbulb size={16} />
                  保存 AI 洞察
                </Button>
              </div>
              {aiError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{aiError}</div>
              ) : null}
            </section>

            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">AI 分析结果</h3>
                {aiAnalysis ? (
                  <div className="mt-4 space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-base font-semibold text-slate-900">硬性门槛</p>
                      <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                        <p>学历：{emptyText(aiAnalysis.mustHave.education)}</p>
                        <p>经验：{emptyText(aiAnalysis.mustHave.experience)}</p>
                        <p className="sm:col-span-2">语言：{emptyText(aiAnalysis.mustHave.language)}</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-500">必备技能</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {aiAnalysis.mustHave.requiredSkills.length > 0 ? (
                              aiAnalysis.mustHave.requiredSkills.map((item) => {
                                const added = preparationItems.some((prep) => prep.content === item) || skillFeedback[item];
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                      added ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                                    )}
                                    disabled={added}
                                    onClick={() => void handleAddSkill(item)}
                                  >
                                    <span>{item}</span>
                                    <span>{added ? "已添加" : "+"}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <span className="text-sm text-slate-400">未提及</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-500">必备证书</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {aiAnalysis.mustHave.requiredCerts.length > 0 ? (
                              aiAnalysis.mustHave.requiredCerts.map((item) => (
                                <Badge key={item} className="border border-slate-200 bg-slate-50 text-slate-700">
                                  {item}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">无</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-base font-semibold text-emerald-950">加分项</p>
                      <div className="mt-3 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-emerald-700">加分技能</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {aiAnalysis.niceToHave.preferredSkills.length > 0 ? (
                              aiAnalysis.niceToHave.preferredSkills.map((item) => {
                                const added = preparationItems.some((prep) => prep.content === item) || skillFeedback[item];
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                      added ? "border-emerald-300 bg-white text-emerald-700" : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300"
                                    )}
                                    disabled={added}
                                    onClick={() => void handleAddSkill(item)}
                                  >
                                    <span>{item}</span>
                                    <span>{added ? "已添加" : "+"}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <span className="text-sm text-emerald-700/70">无</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-emerald-700">加分经验</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {aiAnalysis.niceToHave.preferredExperience.length > 0 ? (
                              aiAnalysis.niceToHave.preferredExperience.map((item) => (
                                <Badge key={item} className="border border-emerald-200 bg-white text-emerald-700">
                                  {item}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-emerald-700/70">无</span>
                            )}
                          </div>
                        </div>

                        {aiAnalysis.niceToHave.preferredCerts.length > 0 ? (
                          <div>
                            <p className="text-sm font-medium text-emerald-700">加分证书</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {aiAnalysis.niceToHave.preferredCerts.map((item) => (
                                <Badge key={item} className="border border-emerald-200 bg-white text-emerald-700">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <p className="text-base font-semibold text-slate-900">核心关键词</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sortedJdKeywords.map((item) => (
                          <Badge key={item.word} className={cn("border", keywordBadgeClass(item.weight))}>
                            {item.word} · {item.weight}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-base font-semibold text-slate-900">风险点</p>
                      {aiAnalysis.riskPoints.map((item) => (
                        <div key={item.label} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-base font-medium text-orange-900">
                          {item.label}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
                      <p className="text-sm font-medium uppercase tracking-wide text-sky-700">岗位画像</p>
                      <p className="mt-2 text-base leading-7 text-sky-950">{aiAnalysis.profile || "暂无画像总结"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {jobDescription?.analysisResult || "待分析"}
                  </div>
                )}
              </section>

            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="简历优化" currentValue={activeTab}>
          <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText size={19} />
                </div>
                <div>
                  <h3 className="text-base font-semibold">简历信息</h3>
                  <p className="mt-1 text-sm text-slate-500">选择用于本岗位匹配分析的简历</p>
                </div>
              </div>

              {selectedResume ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-700">当前关联简历</p>
                  <p className="mt-2 break-words text-sm font-semibold text-emerald-900">{selectedResume.fileName}</p>
                  {selectedResume.isDefault ? <Badge className="mt-3 bg-white text-emerald-700">默认简历</Badge> : null}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  还没有可用简历，请先到个人简历库上传 PDF。
                  <Link to="/resumes" className="mt-3 inline-flex font-medium text-slate-900 underline underline-offset-4">
                    去上传简历
                  </Link>
                </div>
              )}

              <div className="mt-5">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="associatedResume">
                  更换简历
                </label>
                <Select
                  id="associatedResume"
                  value={selectedResumeId?.toString() ?? ""}
                  disabled={resumes.length === 0 || optimizationLoading}
                  onChange={(event) => {
                    const nextResumeId = Number(event.target.value);
                    if (Number.isFinite(nextResumeId)) void handleResumeChange(nextResumeId);
                  }}
                >
                  {resumes.length === 0 ? <option value="">暂无简历</option> : null}
                  {resumes.map((resume) =>
                    resume.id === undefined ? null : (
                      <option key={resume.id} value={resume.id}>
                        {resume.fileName}
                        {resume.isDefault ? "（默认）" : ""}
                      </option>
                    )
                  )}
                </Select>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">AI 优化分析</h3>
                  <p className="mt-1 text-sm text-slate-500">根据已保存的 JD 和当前简历，生成匹配度与修改建议</p>
                </div>
                <Button onClick={() => void handleAnalyzeResumeOptimization()} disabled={optimizationLoading}>
                  <Sparkles size={16} />
                  {optimizationLoading ? "正在分析中..." : "AI 匹配度与优化建议"}
                </Button>
              </div>

              {optimizationError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {optimizationError}
                </div>
              ) : null}

              {resumeOptimization ? (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-sky-700">
                      <Target size={25} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-sky-700">简历匹配度</p>
                      <p className="mt-1 text-3xl font-semibold text-slate-900">
                        {resumeOptimization.matchScore}
                        <span className="ml-1 text-base font-medium text-slate-500">/ 100</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">核心优势</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resumeOptimization.coreStrengths.map((item) => (
                        <Badge key={item} className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-900">待优化方向</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-orange-900">
                      {resumeOptimization.optimizationDirections.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-0.5 shrink-0 text-orange-600">⚠️</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Lightbulb size={17} className="text-amber-500" />
                      <p className="text-sm font-semibold">具体修改建议</p>
                    </div>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                      {resumeOptimization.specificSuggestions.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-amber-500">💡</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                  点击上方按钮，基于当前岗位 JD 和关联简历生成优化建议。
                </div>
              )}
            </section>
          </div>
        </TabsPanel>

        <TabsPanel value="知识准备" currentValue={activeTab}>
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-moss">AI 备战规划</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">把 JD 变成一份可执行的面试清单</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/60">
                    结合岗位 JD 分析与简历分析结果，按业务理解、技能考察、项目深挖三类生成针对性复习点。
                  </p>
                  <p className="mt-2 text-xs text-slate-500">当前使用简历：{analysisResume?.fileName || "未指定"}</p>
                </div>
                <Button onClick={handleRequestGeneratePreparationStrategy} disabled={strategyLoading}>
                  <Sparkles size={16} />
                  {strategyLoading ? "正在生成中..." : "✨ 生成 AI 备战策略"}
                </Button>
              </div>

              {strategyError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {strategyError}
                </div>
              ) : null}

              <form
                className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3"
                onSubmit={handleAddPreparationItem}
              >
                <div className="flex flex-col gap-2 lg:flex-row">
                  <Input
                    className="bg-white"
                    value={preparationTitle}
                    onChange={(event) => setPreparationTitle(event.target.value)}
                    placeholder="手动补充一个备战知识点"
                  />
                  <Select
                    className="lg:w-36"
                    value={preparationCategory}
                    onChange={(event) => setPreparationCategory(event.target.value as PreparationCategory)}
                  >
                    {preparationCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary" className="shrink-0">
                    <Plus size={16} />
                    手动添加
                  </Button>
                </div>
              </form>
            </section>

            <Tabs>
              <TabsList>
                {prepCategoryTabs.map((tab) => {
                  const count = preparationItems.filter((item) => item.category === tab.value).length;

                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      currentValue={activePreparationCategory}
                      onValueChange={(value) => setActivePreparationCategory(value as PreparationCategory)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {tab.label}
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-current">{count}</span>
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {prepCategoryTabs.map((tab) => {
                const categoryItems = preparationItems.filter((item) => item.category === tab.value);

                return (
                  <TabsPanel key={tab.value} value={tab.value} currentValue={activePreparationCategory}>
                    <div className="space-y-3">
                      {categoryItems.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                          暂无备战项
                        </p>
                      ) : (
                        categoryItems.map((item) => {
                          const mastered = item.status === "MASTERED";
                          const expanded = expandedPreparationItemId === item.id;

                          return (
                            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                                  checked={mastered}
                                  aria-label={mastered ? `标记 ${item.content} 为待复习` : `标记 ${item.content} 为已掌握`}
                                  onChange={() => void handleTogglePreparationItem(item.id)}
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={tab.tone}>{tab.badge}</Badge>
                                    {item.source === "AI_GENERATED" ? <Badge className="bg-slate-100 text-slate-600">AI 推荐</Badge> : null}
                                    <span className={cn("text-base font-semibold text-slate-900", mastered && "text-slate-400 line-through")}>
                                      {item.content}
                                    </span>
                                  </div>

                                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">模拟面试题</p>
                                    <p className="mt-2 border-l-4 border-slate-300 pl-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                      {item.aiQuestion || "暂无模拟题"}
                                    </p>
                                  </div>

                                  <div className="mt-3">
                                    <button
                                      type="button"
                                      className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                                      aria-expanded={expanded}
                                      onClick={() => setExpandedPreparationItemId(expanded ? null : item.id)}
                                    >
                                      {expanded ? "收起提示" : "查看提示"}
                                    </button>
                                    {expanded ? (
                                      <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                                        {item.guidance || "暂无提示，建议结合题目和岗位要求自行展开。"}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <Button
                                  variant="secondary"
                                  className="h-8 shrink-0 px-2 text-rose-600"
                                  aria-label={`删除 ${item.content}`}
                                  onClick={() => void handleDeletePreparationItem(item.id)}
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </TabsPanel>
                );
              })}
            </Tabs>
          </div>
        </TabsPanel>

        <TabsPanel value="面试复盘" currentValue={activeTab}>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleAddInterviewReview}>
              <h3 className="text-base font-semibold">新增复盘记录</h3>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interviewRound">
                      面试轮次
                    </label>
                    <Select
                      id="interviewRound"
                      value={reviewForm.round}
                      onChange={(event) =>
                        setReviewForm((current) => ({ ...current, round: event.target.value as InterviewReview["round"] }))
                      }
                    >
                      {interviewRounds.map((round) => (
                        <option key={round} value={round}>
                          {round}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interviewDate">
                      面试日期
                    </label>
                    <Input
                      id="interviewDate"
                      type="date"
                      value={reviewForm.interviewDate}
                      onChange={(event) => setReviewForm((current) => ({ ...current, interviewDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interviewer">
                    面试官
                  </label>
                  <Input
                    id="interviewer"
                    value={reviewForm.interviewer}
                    onChange={(event) => setReviewForm((current) => ({ ...current, interviewer: event.target.value }))}
                    placeholder="可填写姓名、角色或部门"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="reviewQuestion">
                    面试问题
                  </label>
                  <Textarea
                    id="reviewQuestion"
                    rows={4}
                    value={reviewForm.question}
                    onChange={(event) => {
                      setReviewForm((current) => ({ ...current, question: event.target.value }));
                      setReviewAiAnalysis(null);
                    }}
                    placeholder="记录面试官提出的原始问题"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qaNotes">
                    我的回答
                  </label>
                  <Textarea
                    id="qaNotes"
                    rows={8}
                    value={reviewForm.userAnswer}
                    onChange={(event) => {
                      setReviewForm((current) => ({ ...current, userAnswer: event.target.value }));
                      setReviewAiAnalysis(null);
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">自我评分</label>
                  <RatingStars
                    value={reviewForm.selfRating}
                    onChange={(value) => setReviewForm((current) => ({ ...current, selfRating: value }))}
                  />
                </div>
                <div className="space-y-3">
                  <Button type="button" className="w-full" onClick={() => void handleAnalyzeInterviewReview()} disabled={reviewAiLoading}>
                    <Search size={16} />
                    {reviewAiLoading ? "正在解析中..." : "🔍 AI 深度解析"}
                  </Button>

                  {reviewAiError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{reviewAiError}</div>
                  ) : null}

                  {reviewAiAnalysis ? (
                    <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-sky-600" />
                        <h4 className="text-sm font-semibold text-sky-950">AI 分析报告</h4>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-xs font-medium text-sky-700">🎯 提问意图解析</p>
                          <p className="mt-1 text-sm leading-6 text-sky-950">{reviewAiAnalysis.intent}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-sky-700">💡 回答优化建议</p>
                          {reviewAiAnalysis.suggestions.length > 0 ? (
                            <ul className="mt-1 space-y-1 text-sm leading-6 text-sky-950">
                              {reviewAiAnalysis.suggestions.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="text-sky-500">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-sm leading-6 text-sky-950">{reviewAiAnalysis.optimizedSuggestion}</p>
                          )}
                        </div>
                      </div>
                    </section>
                  ) : null}
                </div>
                <Button type="submit">
                  <Plus size={16} />
                  添加复盘
                </Button>
              </div>
            </form>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">复盘卡片</h3>
              <div className="mt-4 space-y-3">
                {interviewReviews.length === 0 ? (
                  <p className="text-sm text-slate-500">还没有面试复盘记录。</p>
                ) : (
                  interviewReviews.map((review) => {
                    const optimized = Boolean(review.aiAnalysis || review.optimizedSuggestion);

                    return (
                      <article key={review.id} className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setSelectedReview(review)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold">{review.round}</h4>
                              {optimized ? <Badge className="bg-violet-50 text-violet-700">✨ 已优化</Badge> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {review.interviewDate} / {review.interviewer || "面试官未填写"}
                            </p>
                            <div className="mt-2">
                              <RatingStars value={review.selfRating} readonly />
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">{getReviewQuestion(review)}</p>
                            <p className="mt-1 text-xs text-slate-400">点击查看完整复盘</p>
                          </button>
                          <Button
                            variant="secondary"
                            className="h-8 shrink-0 px-2 text-rose-600"
                            aria-label={`删除 ${review.round} ${review.interviewDate} 复盘`}
                            onClick={() => setDeleteReviewTarget(review)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </TabsPanel>
      </Tabs>

      <Modal
        open={strategyConfirmOpen}
        title="生成 AI 备战策略"
        description="是否需要先手动补充备战知识点？"
        cancelLabel="是，我要补充"
        confirmLabel="否，开始出题"
        onClose={() => setStrategyConfirmOpen(false)}
        onConfirm={() => {
          setStrategyConfirmOpen(false);
          void handleGeneratePreparationStrategy();
        }}
      >
        <p className="text-sm leading-6 text-slate-600">
          选择“否，开始出题”后，AI 会基于已加入的知识点、JD 分析和当前简历分析结果，统一生成模拟面试题和回答提示。
        </p>
      </Modal>

      <Modal
        open={Boolean(selectedReview)}
        title="复盘详情"
        confirmLabel="关闭"
        showCancel={false}
        panelClassName="max-w-4xl"
        onClose={() => setSelectedReview(null)}
        onConfirm={() => setSelectedReview(null)}
      >
        {selectedReview ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">我的原始记录</p>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">面试问题</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{getReviewQuestion(selectedReview)}</p>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500">我的回答</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{getReviewAnswer(selectedReview)}</p>
              </div>
            </section>

            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-medium text-sky-700">AI 教练点评</p>
              {selectedReview.aiAnalysis || selectedReview.optimizedSuggestion ? (
                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-sky-700">🎯 提问意图</p>
                    <p className="mt-1 text-sm leading-6 text-sky-950">
                      {selectedReview.aiAnalysis?.intent || "该历史记录未保存提问意图解析。"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-sky-700">💡 优化建议</p>
                    {selectedReview.aiAnalysis?.suggestions?.length ? (
                      <ul className="mt-1 space-y-1 text-sm leading-6 text-sky-950">
                        {selectedReview.aiAnalysis.suggestions.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="text-sky-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm leading-6 text-sky-950">
                        {selectedReview.aiAnalysis?.optimizedSuggestion || selectedReview.optimizedSuggestion}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-sky-900">这条历史复盘尚未生成 AI 点评。</p>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleteReviewTarget)}
        title="删除面试复盘"
        description={`确定要删除 ${deleteReviewTarget?.round ?? ""} 的这条复盘吗？此操作不可恢复。`}
        danger
        confirmLabel="确认删除"
        onClose={() => setDeleteReviewTarget(null)}
        onConfirm={() => void handleDeleteInterviewReview()}
      />
    </div>
  );
}
