import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Sparkles, Save, Plus } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { buildInterviewPrompt, buildJobAnalysisPrompt, buildMatchPrompt } from "../lib/prompts";
import { useWorkspaceStore } from "../store/workspaceStore";
import { assetTypes } from "../lib/constants";

const tabs = [
  "岗位信息",
  "需求分析",
  "简历素材",
  "匹配分析",
  "优化输出",
  "面试复盘"
] as const;

export function JobRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const applications = useWorkspaceStore((state) => state.applications);
  const jobDescriptions = useWorkspaceStore((state) => state.jobDescriptions);
  const resumeProfiles = useWorkspaceStore((state) => state.resumeProfiles);
  const matchAnalyses = useWorkspaceStore((state) => state.matchAnalyses);
  const interviewRecords = useWorkspaceStore((state) => state.interviewRecords);
  const careerAssets = useWorkspaceStore((state) => state.careerAssets);
  const saveJobDescription = useWorkspaceStore((state) => state.saveJobDescription);
  const saveResumeProfile = useWorkspaceStore((state) => state.saveResumeProfile);
  const saveMatchAnalysis = useWorkspaceStore((state) => state.saveMatchAnalysis);
  const createInterviewRecord = useWorkspaceStore((state) => state.createInterviewRecord);
  const upsertCareerAsset = useWorkspaceStore((state) => state.upsertCareerAsset);
  const [tab, setTab] = useState<(typeof tabs)[number]>("岗位信息");
  const [copied, setCopied] = useState(false);

  const application = applications.find((item) => item.id === id);
  const jd = jobDescriptions.find((item) => item.applicationId === id);
  const resume = resumeProfiles.find((item) => item.applicationId === id);
  const match = matchAnalyses.find((item) => item.applicationId === id);
  const records = interviewRecords.filter((item) => item.applicationId === id);

  const [jdForm, setJdForm] = useState({ source: "", rawText: "", responsibilities: "", requirements: "" });
  const [resumeForm, setResumeForm] = useState({ summary: "", projects: "", skills: "", achievements: "" });
  const [matchForm, setMatchForm] = useState({ score: 0, strengths: "", gaps: "", suggestions: "", optimizedOutput: "" });
  const [recordForm, setRecordForm] = useState({
    question: "",
    answer: "",
    insight: "",
    assessedAbility: "",
    betterAnswer: "",
    weakness: "",
    nextAction: ""
  });

  useEffect(() => {
    if (!application) {
      return;
    }
    setJdForm({
      source: jd?.source ?? "",
      rawText: jd?.rawText ?? "",
      responsibilities: jd?.responsibilities.join("\n") ?? "",
      requirements: jd?.requirements.join("\n") ?? ""
    });
    setResumeForm({
      summary: resume?.summary ?? "",
      projects: resume?.projects ?? "",
      skills: resume?.skills ?? "",
      achievements: resume?.achievements ?? ""
    });
    setMatchForm({
      score: match?.score ?? 0,
      strengths: match?.strengths ?? "",
      gaps: match?.gaps ?? "",
      suggestions: match?.suggestions ?? "",
      optimizedOutput: match?.optimizedOutput ?? ""
    });
  }, [application, jd, match, resume]);

  const prompt = useMemo(() => {
    if (!application) return "";
    if (tab === "岗位信息") return buildJobAnalysisPrompt(application, jd);
    if (tab === "匹配分析") return buildMatchPrompt(application, jd, resume);
    return buildInterviewPrompt(application, records[0] ?? { applicationId: id ?? "", question: "", answer: "", insight: "", assessedAbility: "", betterAnswer: "", weakness: "", nextAction: "", id: "", createdAt: "" });
  }, [application, jd, resume, records, tab, id]);

  if (!application) {
    return (
      <EmptyState
        title="这个投递不存在"
        description="可能已被删除，或者你还没有创建对应投递。"
        action={
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            返回工作台
          </button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`${application.company} · ${application.role}`}
        description="每个投递单独开一间：岗位信息获取、需求分析、简历素材录入、匹配度分析、优化输出和面试复盘都放在这里。"
        action={
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Copy size={16} />
              {copied ? "已复制" : "复制 Prompt"}
            </button>
            <Link to="/" className="btn btn-primary">
              <ArrowLeft size={16} />
              返回列表
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} className={`btn ${tab === item ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel space-y-4">
          {tab === "岗位信息" ? (
            <>
              <h3 className="text-base font-semibold">岗位信息</h3>
              <div className="grid gap-3">
                <div>
                  <label className="label">JD 来源</label>
                  <input className="field" value={jdForm.source} onChange={(e) => setJdForm({ ...jdForm, source: e.target.value })} />
                </div>
                <div>
                  <label className="label">JD 原文</label>
                  <textarea className="field min-h-52" value={jdForm.rawText} onChange={(e) => setJdForm({ ...jdForm, rawText: e.target.value })} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">职责（每行一条）</label>
                    <textarea className="field min-h-40" value={jdForm.responsibilities} onChange={(e) => setJdForm({ ...jdForm, responsibilities: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">要求（每行一条）</label>
                    <textarea className="field min-h-40" value={jdForm.requirements} onChange={(e) => setJdForm({ ...jdForm, requirements: e.target.value })} />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await saveJobDescription({
                      applicationId: application.id,
                      source: jdForm.source.trim(),
                      rawText: jdForm.rawText.trim(),
                      responsibilities: jdForm.responsibilities.split("\n").map((item) => item.trim()).filter(Boolean),
                      requirements: jdForm.requirements.split("\n").map((item) => item.trim()).filter(Boolean)
                    });
                  }}
                >
                  <Save size={16} />
                  保存岗位信息
                </button>
              </div>
            </>
          ) : null}

          {tab === "需求分析" ? (
            <>
              <h3 className="text-base font-semibold">需求分析</h3>
              <p className="text-sm text-ink/60">先把分析 Prompt 复制给模型，模型结果再粘贴回来。MVP 阶段把工作流跑通比接 API 更重要。</p>
              <textarea className="field min-h-60" readOnly value={buildJobAnalysisPrompt(application, jd)} />
            </>
          ) : null}

          {tab === "简历素材" ? (
            <>
              <h3 className="text-base font-semibold">简历素材录入</h3>
              <div className="grid gap-3">
                <div>
                  <label className="label">简历概述</label>
                  <textarea className="field min-h-24" value={resumeForm.summary} onChange={(e) => setResumeForm({ ...resumeForm, summary: e.target.value })} />
                </div>
                <div>
                  <label className="label">项目经历</label>
                  <textarea className="field min-h-24" value={resumeForm.projects} onChange={(e) => setResumeForm({ ...resumeForm, projects: e.target.value })} />
                </div>
                <div>
                  <label className="label">技能</label>
                  <textarea className="field min-h-24" value={resumeForm.skills} onChange={(e) => setResumeForm({ ...resumeForm, skills: e.target.value })} />
                </div>
                <div>
                  <label className="label">成就</label>
                  <textarea className="field min-h-24" value={resumeForm.achievements} onChange={(e) => setResumeForm({ ...resumeForm, achievements: e.target.value })} />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await saveResumeProfile({ applicationId: application.id, ...resumeForm });
                  }}
                >
                  <Save size={16} />
                  保存简历素材
                </button>
              </div>
            </>
          ) : null}

          {tab === "匹配分析" ? (
            <>
              <h3 className="text-base font-semibold">匹配度分析</h3>
              <div className="grid gap-3">
                <div>
                  <label className="label">匹配分数</label>
                  <input className="field" type="number" min="0" max="100" value={matchForm.score} onChange={(e) => setMatchForm({ ...matchForm, score: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">优势</label>
                  <textarea className="field min-h-20" value={matchForm.strengths} onChange={(e) => setMatchForm({ ...matchForm, strengths: e.target.value })} />
                </div>
                <div>
                  <label className="label">差距</label>
                  <textarea className="field min-h-20" value={matchForm.gaps} onChange={(e) => setMatchForm({ ...matchForm, gaps: e.target.value })} />
                </div>
                <div>
                  <label className="label">优化建议</label>
                  <textarea className="field min-h-20" value={matchForm.suggestions} onChange={(e) => setMatchForm({ ...matchForm, suggestions: e.target.value })} />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await saveMatchAnalysis({ applicationId: application.id, ...matchForm });
                  }}
                >
                  <Save size={16} />
                  保存分析
                </button>
              </div>
            </>
          ) : null}

          {tab === "优化输出" ? (
            <>
              <h3 className="text-base font-semibold">建立优化输出</h3>
              <textarea className="field min-h-64" value={matchForm.optimizedOutput} onChange={(e) => setMatchForm({ ...matchForm, optimizedOutput: e.target.value })} />
              <button
                className="btn btn-primary mt-3"
                onClick={async () => {
                  await saveMatchAnalysis({ applicationId: application.id, ...matchForm });
                }}
              >
                <Save size={16} />
                保存优化输出
              </button>
            </>
          ) : null}

          {tab === "面试复盘" ? (
            <>
              <h3 className="text-base font-semibold">面试问题复盘</h3>
              <div className="grid gap-3">
                <div>
                  <label className="label">面试题</label>
                  <textarea className="field min-h-20" value={recordForm.question} onChange={(e) => setRecordForm({ ...recordForm, question: e.target.value })} />
                </div>
                <div>
                  <label className="label">回答</label>
                  <textarea className="field min-h-20" value={recordForm.answer} onChange={(e) => setRecordForm({ ...recordForm, answer: e.target.value })} />
                </div>
                <div>
                  <label className="label">考察点</label>
                  <textarea className="field min-h-20" value={recordForm.assessedAbility} onChange={(e) => setRecordForm({ ...recordForm, assessedAbility: e.target.value })} />
                </div>
                <div>
                  <label className="label">复盘结论</label>
                  <textarea className="field min-h-20" value={recordForm.insight} onChange={(e) => setRecordForm({ ...recordForm, insight: e.target.value })} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">优秀回答要点</label>
                    <textarea className="field min-h-20" value={recordForm.betterAnswer} onChange={(e) => setRecordForm({ ...recordForm, betterAnswer: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">暴露短板</label>
                    <textarea className="field min-h-20" value={recordForm.weakness} onChange={(e) => setRecordForm({ ...recordForm, weakness: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">下次改进</label>
                  <textarea className="field min-h-20" value={recordForm.nextAction} onChange={(e) => setRecordForm({ ...recordForm, nextAction: e.target.value })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      await createInterviewRecord({ applicationId: application.id, ...recordForm });
                      const assetType = recordForm.question.includes("项目") ? "项目素材" : "常见面试题";
                      await upsertCareerAsset({
                        type: assetType,
                        title: recordForm.question || "面试复盘",
                        content: [recordForm.insight, recordForm.betterAnswer, recordForm.nextAction].filter(Boolean).join("\n\n"),
                        tags: [application.company, application.role].filter(Boolean),
                        sourceApplicationId: application.id
                      });
                      setRecordForm({
                        question: "",
                        answer: "",
                        insight: "",
                        assessedAbility: "",
                        betterAnswer: "",
                        weakness: "",
                        nextAction: ""
                      });
                    }}
                  >
                    <Plus size={16} />
                    保存并回流资产
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="panel">
            <h3 className="mb-3 text-base font-semibold">岗位提示词</h3>
            <textarea className="field min-h-72" readOnly value={prompt} />
          </section>
          <section className="panel">
            <h3 className="mb-3 text-base font-semibold">岗位空间内的资产</h3>
            <div className="space-y-3">
              {careerAssets.filter((item) => item.sourceApplicationId === application.id).length === 0 ? (
                <p className="text-sm text-ink/55">还没有沉淀资产。</p>
              ) : (
                careerAssets
                  .filter((item) => item.sourceApplicationId === application.id)
                  .map((item) => (
                    <div key={item.id} className="rounded-md border border-ink/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge bg-moss/10 text-moss">{item.type}</span>
                        <span className="text-xs text-ink/45">{item.tags.join(" / ")}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/60">{item.content}</p>
                    </div>
                  ))
              )}
            </div>
          </section>
          <section className="panel">
            <h3 className="mb-3 text-base font-semibold">面试记录</h3>
            <div className="space-y-3">
              {records.length === 0 ? (
                <p className="text-sm text-ink/55">还没有面试题。</p>
              ) : (
                records.map((item) => (
                  <div key={item.id} className="rounded-md border border-ink/10 p-3">
                    <p className="text-sm font-semibold">{item.question}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink/60">{item.insight}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-4 panel">
        <p className="text-sm text-ink/60">
          当前可编辑的工作区已覆盖：岗位信息、需求分析、简历录入、匹配分析、优化输出、面试复盘和资产回流。选项卡下的内容都在本地浏览器里。
        </p>
        <p className="mt-2 text-xs text-ink/45">
          资产类型预留：{assetTypes.join(" / ")}
        </p>
      </div>
    </div>
  );
}
