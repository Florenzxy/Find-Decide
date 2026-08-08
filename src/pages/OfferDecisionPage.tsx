import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Plus, Save, Sparkles, Trash2, Trophy } from "lucide-react";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button, Input, Select } from "../components/ui";
import { deleteOfferDecision, deleteOfferDecisionDrafts, loadOfferDecisions, saveOfferDecision } from "../db/db";
import { createId, nowIso } from "../lib/utils";
import { calculateOfferTotal, findWinningOptionId } from "../lib/offerDecision";
import type { OfferDecision, OfferDecisionData, OfferDecisionFactor, OfferDecisionOption } from "../types/schema";

const commonFactors = ["薪资福利", "职业发展", "工作内容", "通勤时长", "公司稳定性", "团队氛围"];

function createInitialData(): OfferDecisionData {
  const factors = commonFactors.slice(0, 3).map((name) => ({
    id: createId("factor"),
    name,
    weight: 3
  }));

  return {
    factors,
    options: [
      {
        id: createId("offer"),
        name: "公司 A",
        scores: Object.fromEntries(factors.map((factor) => [factor.id, 5]))
      },
      {
        id: createId("offer"),
        name: "公司 B",
        scores: Object.fromEntries(factors.map((factor) => [factor.id, 5]))
      }
    ]
  };
}

function mergeOptionScores(option: OfferDecisionOption, factors: OfferDecisionFactor[]) {
  return {
    ...option,
    scores: Object.fromEntries(factors.map((factor) => [factor.id, option.scores[factor.id] ?? 5]))
  };
}

function formatDecisionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function OfferDecisionPage() {
  const [title, setTitle] = useState("我的 Offer 对比");
  const [data, setData] = useState<OfferDecisionData>(() => createInitialData());
  const [decisionId, setDecisionId] = useState<number | undefined>();
  const [createdAt, setCreatedAt] = useState(nowIso);
  const [isDraft, setIsDraft] = useState(true);
  const [history, setHistory] = useState<OfferDecision[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<OfferDecision | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const winningOptionId = useMemo(() => findWinningOptionId(data), [data]);
  const totals = useMemo(
    () =>
      data.options.map((option) => ({
        option,
        total: calculateOfferTotal(data, option)
      })),
    [data]
  );
  const maxTotal = Math.max(...totals.map((item) => item.total), 0);
  const selectedHistoryTotals = selectedHistory
    ? selectedHistory.data.options.map((option) => ({
        option,
        total: calculateOfferTotal(selectedHistory.data, option)
      }))
    : [];
  const selectedHistoryWinnerId = selectedHistory ? findWinningOptionId(selectedHistory.data) : null;

  useEffect(() => {
    let active = true;

    void loadOfferDecisions().then((decisions) => {
      if (!active) return;
      const latestDraft = decisions.find((decision) => decision.isDraft);
      const latestSaved = decisions.find((decision) => !decision.isDraft);
      const latest = latestDraft ?? latestSaved;
      if (latest) {
        setDecisionId(latest.id);
        setTitle(latest.title);
        setCreatedAt(latest.createdAt);
        setIsDraft(Boolean(latest.isDraft));
        setData(latest.data);
      }
      setHistory(decisions.filter((decision) => !decision.isDraft));
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(
    async (showMessage = false, createHistory = false) => {
      if (createHistory && saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setSaving(true);
      try {
        const shouldCreateRecord = createHistory || !isDraft || decisionId === undefined;
        const nextCreatedAt = shouldCreateRecord ? nowIso() : createdAt;
        const saved = await saveOfferDecision({
          id: shouldCreateRecord ? undefined : decisionId,
          title: title.trim() || "我的 Offer 对比",
          createdAt: nextCreatedAt,
          isDraft: !createHistory,
          data
        });
        setDecisionId(saved.id);
        setCreatedAt(saved.createdAt);
        setIsDraft(!createHistory);
        if (createHistory) {
          await deleteOfferDecisionDrafts();
          setHistory((await loadOfferDecisions()).filter((decision) => !decision.isDraft));
        }
        if (showMessage) {
          setNotice("决策已保存到本地");
          window.setTimeout(() => setNotice(""), 1800);
        }
      } finally {
        setSaving(false);
      }
    },
    [createdAt, data, decisionId, isDraft, title]
  );

  useEffect(() => {
    if (!ready) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persist();
    }, 500);

    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [data, ready, title]);

  function updateFactor(factorId: string, patch: Partial<OfferDecisionFactor>) {
    setData((current) => ({
      ...current,
      factors: current.factors.map((factor) => (factor.id === factorId ? { ...factor, ...patch } : factor))
    }));
  }

  function addFactor() {
    const factor = { id: createId("factor"), name: "", weight: 3 };
    setData((current) => ({
      factors: [...current.factors, factor],
      options: current.options.map((option) => ({
        ...option,
        scores: { ...option.scores, [factor.id]: 5 }
      }))
    }));
  }

  function removeFactor(factorId: string) {
    setData((current) => ({
      factors: current.factors.filter((factor) => factor.id !== factorId),
      options: current.options.map((option) => {
        const scores = { ...option.scores };
        delete scores[factorId];
        return { ...option, scores };
      })
    }));
  }

  function addOption() {
    setData((current) => ({
      ...current,
      options: [
        ...current.options,
        {
          id: createId("offer"),
          name: `公司 ${String.fromCharCode(65 + current.options.length)}`,
          scores: Object.fromEntries(current.factors.map((factor) => [factor.id, 5]))
        }
      ]
    }));
  }

  function removeOption(optionId: string) {
    if (data.options.length <= 1) return;
    setData((current) => ({
      ...current,
      options: current.options.filter((option) => option.id !== optionId)
    }));
  }

  function updateOption(optionId: string, patch: Partial<OfferDecisionOption>) {
    setData((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option))
    }));
  }

  function updateScore(optionId: string, factorId: string, score: number) {
    const nextScore = Math.max(1, Math.min(10, Number.isFinite(score) ? score : 5));
    setData((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === optionId ? { ...option, scores: { ...option.scores, [factorId]: nextScore } } : option
      )
    }));
  }

  function fillCommonFactors() {
    setData((current) => {
      const existing = new Set(current.factors.map((factor) => factor.name.trim()));
      const additions = commonFactors
        .filter((name) => !existing.has(name))
        .map((name) => ({ id: createId("factor"), name, weight: 3 }));
      const factors = [...current.factors, ...additions];

      return {
        factors,
        options: current.options.map((option) => mergeOptionScores(option, factors))
      };
    });
  }

  async function removeHistoryReport(report: OfferDecision) {
    if (report.id === undefined) return;
    const confirmed = window.confirm(`确定要删除「${report.title}」这份历史决策报告吗？此操作不可恢复。`);
    if (!confirmed) return;

    await deleteOfferDecision(report.id);
    setHistory((current) => current.filter((item) => item.id !== report.id));
    if (selectedHistory?.id === report.id) {
      setSelectedHistory(null);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Offer 决策助手"
        description="把薪资、成长、稳定性和个人偏好放到同一张加权矩阵里，帮助你看清每个职业选项的真实取舍。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowResults((current) => !current)}>
              <BarChart3 size={16} />
              {showResults ? "收起结果" : "查看结果"}
            </Button>
            <Button onClick={() => void persist(true, true)} disabled={saving}>
              <Save size={16} />
              {saving ? "保存中..." : "保存决策"}
            </Button>
          </div>
        }
      />

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex max-w-xl items-center gap-4">
          <label className="shrink-0 text-lg font-semibold text-slate-900" htmlFor="decisionTitle">
            决策主题
          </label>
          <Input id="decisionTitle" className="max-w-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
      </section>

      {showResults ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-emerald-700" />
            <h3 className="font-semibold text-emerald-950">加权结果</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {totals.map(({ option, total }) => (
              <div
                key={option.id}
                className={`rounded-xl border bg-white p-4 ${option.id === winningOptionId ? "border-emerald-400 ring-2 ring-emerald-100" : "border-emerald-100"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-slate-900">{option.name || "未命名选项"}</span>
                  {option.id === winningOptionId ? <Badge className="bg-emerald-100 text-emerald-700">推荐选择</Badge> : null}
                </div>
                <p className="mt-3 text-3xl font-semibold text-emerald-800">{total}</p>
                <div className="mt-3 h-2 rounded-full bg-emerald-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${maxTotal ? (total / maxTotal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">加权决策矩阵</h3>
            <p className="mt-1 text-sm text-slate-500">每个因素按 1–5 设置权重，每个选项按 1–10 进行评分。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={fillCommonFactors}>
              <Sparkles size={16} />
              填入常见因素
            </Button>
            <Button variant="secondary" onClick={addOption}>
              <Plus size={16} />
              添加选项
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 z-10 min-w-[240px] border-r border-slate-700 bg-slate-900 px-4 py-3 text-left font-semibold">
                  影响因素 / 权重
                </th>
                {data.options.map((option) => (
                  <th key={option.id} className="min-w-[170px] border-r border-slate-700 px-3 py-3 text-left font-semibold">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`${option.name} 名称`}
                        className="h-9 border-slate-600 bg-slate-800 text-white placeholder:text-slate-400"
                        value={option.name}
                        onChange={(event) => updateOption(option.id, { name: event.target.value })}
                      />
                      <Button
                        variant="secondary"
                        className="h-9 w-9 shrink-0 border-slate-600 bg-slate-800 px-0 text-rose-300 hover:bg-slate-700"
                        aria-label={`删除选项 ${option.name || "未命名"}`}
                        title={data.options.length <= 1 ? "至少保留一个选项" : "删除选项"}
                        disabled={data.options.length <= 1}
                        onClick={() => removeOption(option.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.factors.map((factor) => (
                <tr key={factor.id} className="border-b border-slate-200">
                  <td className="sticky left-0 z-[1] border-r border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 w-8 shrink-0 px-0 text-rose-600"
                        aria-label={`删除因素 ${factor.name || "未命名"}`}
                        onClick={() => removeFactor(factor.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Input
                        aria-label={`因素名称 ${factor.name || "未命名"}`}
                        className="min-w-0"
                        placeholder="因素名称"
                        value={factor.name}
                        onChange={(event) => updateFactor(factor.id, { name: event.target.value })}
                      />
                      <Select
                        aria-label={`${factor.name || "因素"} 权重`}
                        className="w-20 shrink-0 border-orange-200 bg-orange-50 text-orange-800"
                        value={factor.weight}
                        onChange={(event) => updateFactor(factor.id, { weight: Number(event.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map((weight) => (
                          <option key={weight} value={weight}>
                            {weight}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                  {data.options.map((option) => (
                    <td key={option.id} className="border-r border-slate-200 px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Input
                          aria-label={`${option.name || "选项"} 在 ${factor.name || "因素"} 的得分`}
                          type="number"
                          min={1}
                          max={10}
                          className="h-10 text-center font-semibold"
                          value={option.scores[factor.id] ?? 5}
                          onChange={(event) => updateScore(option.id, factor.id, Number(event.target.value))}
                        />
                        <span className="text-xs text-slate-400">/10</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="sticky left-0 z-[1] border-r border-slate-200 bg-slate-50 px-4 py-4 text-slate-700">加权总分</td>
                {totals.map(({ option, total }) => (
                  <td
                    key={option.id}
                    className={`border-r border-slate-200 px-3 py-4 ${option.id === winningOptionId ? "bg-emerald-50 text-emerald-800" : "text-slate-800"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{total}</span>
                      {option.id === winningOptionId ? <Badge className="bg-emerald-100 text-emerald-700">胜出</Badge> : null}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">公式：加权总分 = Σ（因素得分 × 因素权重）</p>
          <Button variant="secondary" onClick={addFactor}>
            <Plus size={16} />
            添加因素
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">历史决策报告</h3>
            <p className="mt-1 text-sm text-slate-500">每次点击“保存决策”都会生成一份独立快照，方便回看当时的选择依据。</p>
          </div>
          <Badge className="w-fit bg-slate-100 text-slate-600">{history.length} 份报告</Badge>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            暂无历史决策报告，完成一次保存后会出现在这里。
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {history.map((report) => {
              const reportWinnerId = findWinningOptionId(report.data);
              const reportWinner = report.data.options.find((option) => option.id === reportWinnerId);
              const reportWinnerTotal = reportWinner ? calculateOfferTotal(report.data, reportWinner) : 0;

              return (
                <div
                  key={report.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedHistory(report)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-slate-900">{report.title}</h4>
                        <p className="mt-1 text-xs text-slate-500">{formatDecisionDate(report.createdAt)}</p>
                      </div>
                      <BarChart3 size={18} className="shrink-0 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      推荐：<span className="font-semibold text-emerald-700">{reportWinner?.name || "暂无"}</span>
                      <span className="ml-2 text-slate-400">总分 {reportWinnerTotal}</span>
                    </p>
                  </button>
                  <Button
                    variant="secondary"
                    className="h-9 w-9 shrink-0 px-0 text-rose-600"
                    aria-label={`删除历史决策报告 ${report.title}`}
                    title="删除历史决策报告"
                    onClick={() => void removeHistoryReport(report)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selectedHistory)}
        title={selectedHistory?.title || "历史决策报告"}
        confirmLabel="关闭"
        showCancel={false}
        panelClassName="max-w-5xl"
        onClose={() => setSelectedHistory(null)}
        onConfirm={() => setSelectedHistory(null)}
      >
        {selectedHistory ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>保存时间：{formatDecisionDate(selectedHistory.createdAt)}</span>
              {selectedHistoryWinnerId ? (
                <Badge className="bg-emerald-100 text-emerald-700">
                  推荐：{selectedHistory.data.options.find((option) => option.id === selectedHistoryWinnerId)?.name || "暂无"}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedHistoryTotals.map(({ option, total }) => (
                <div
                  key={option.id}
                  className={`rounded-xl border p-4 ${option.id === selectedHistoryWinnerId ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <p className="font-semibold text-slate-900">{option.name}</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-800">{total}</p>
                  {option.id === selectedHistoryWinnerId ? <p className="mt-1 text-xs text-emerald-700">推荐选择</p> : null}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[680px] w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-left text-white">
                    <th className="px-3 py-3">影响因素 / 权重</th>
                    {selectedHistory.data.options.map((option) => (
                      <th key={option.id} className="px-3 py-3">
                        {option.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedHistory.data.factors.map((factor) => (
                    <tr key={factor.id} className="border-t border-slate-200">
                      <td className="px-3 py-3 font-medium text-slate-700">
                        {factor.name} <span className="text-orange-600">× {factor.weight}</span>
                      </td>
                      {selectedHistory.data.options.map((option) => (
                        <td key={option.id} className="px-3 py-3 text-slate-700">
                          {option.scores[factor.id] ?? 0} / 10
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
