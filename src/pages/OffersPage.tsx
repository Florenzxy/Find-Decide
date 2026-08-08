import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { defaultDecisionCriteria } from "../lib/constants";
import { calculateOfferScore, rankOffers } from "../lib/scoring";
import { useWorkspaceStore } from "../store/workspaceStore";

export function OffersPage() {
  const offerOptions = useWorkspaceStore((state) => state.offerOptions);
  const decisionCriteria = useWorkspaceStore((state) => state.decisionCriteria.length ? state.decisionCriteria : defaultDecisionCriteria);
  const createOfferOption = useWorkspaceStore((state) => state.createOfferOption);
  const updateOfferOption = useWorkspaceStore((state) => state.updateOfferOption);
  const deleteOfferOption = useWorkspaceStore((state) => state.deleteOfferOption);
  const updateCriterion = useWorkspaceStore((state) => state.updateCriterion);
  const [form, setForm] = useState({ company: "", role: "", salary: "", notes: "" });

  const ranked = useMemo(() => rankOffers(offerOptions, decisionCriteria), [decisionCriteria, offerOptions]);

  return (
    <div>
      <PageHeader
        title="Offer 决策制定"
        description="对多个职业选项按维度逐一分析、评分和排序，帮助你做出更透明的选择。"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel space-y-3">
          <h3 className="text-base font-semibold">新增 Offer 选项</h3>
          <div>
            <label className="label">公司</label>
            <input className="field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <label className="label">岗位</label>
            <input className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div>
            <label className="label">薪资</label>
            <input className="field" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </div>
          <div>
            <label className="label">备注</label>
            <textarea className="field min-h-24" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!form.company.trim() || !form.role.trim()) return;
              await createOfferOption({ company: form.company.trim(), role: form.role.trim(), salary: form.salary.trim(), notes: form.notes.trim() });
              setForm({ company: "", role: "", salary: "", notes: "" });
            }}
          >
            新建选项
          </button>

          <div className="pt-4">
            <h4 className="mb-3 text-sm font-semibold">决策权重</h4>
            <div className="space-y-3">
              {decisionCriteria.map((criterion) => (
                <div key={criterion.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{criterion.name}</span>
                    <span className="text-ink/50">{criterion.weight}</span>
                  </div>
                  <input
                    className="w-full"
                    type="range"
                    min="0"
                    max="30"
                    value={criterion.weight}
                    onChange={(e) => updateCriterion(criterion.id, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {offerOptions.length === 0 ? (
            <EmptyState
              title="还没有 Offer 选项"
              description="先录入几个职业机会，再按维度打分和排序。"
            />
          ) : (
            ranked.map((offer) => (
              <div key={offer.id} className="panel space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{offer.company}</h3>
                    <p className="text-sm text-ink/60">{offer.role}</p>
                  </div>
                  <div className="rounded-md bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">
                    综合得分 {calculateOfferScore(offer, decisionCriteria)}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {decisionCriteria.map((criterion) => (
                    <label key={criterion.id} className="rounded-md border border-ink/10 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>{criterion.name}</span>
                        <span className="text-ink/45">权重 {criterion.weight}</span>
                      </div>
                      <input
                        className="field"
                        type="number"
                        min="0"
                        max="10"
                        value={offer.scores[criterion.id]?.score ?? 0}
                        onChange={(e) =>
                          updateOfferOption(offer.id, {
                            scores: {
                              ...offer.scores,
                              [criterion.id]: {
                                score: Number(e.target.value),
                                reason: offer.scores[criterion.id]?.reason ?? ""
                              }
                            }
                          })
                        }
                      />
                      <textarea
                        className="field mt-2 min-h-20"
                        placeholder="评分理由"
                        value={offer.scores[criterion.id]?.reason ?? ""}
                        onChange={(e) =>
                          updateOfferOption(offer.id, {
                            scores: {
                              ...offer.scores,
                              [criterion.id]: {
                                score: offer.scores[criterion.id]?.score ?? 0,
                                reason: e.target.value
                              }
                            }
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <textarea
                  className="field min-h-24"
                  value={offer.notes}
                  onChange={(e) => updateOfferOption(offer.id, { notes: e.target.value })}
                />
                <button className="btn btn-danger" onClick={() => deleteOfferOption(offer.id)}>
                  删除选项
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
