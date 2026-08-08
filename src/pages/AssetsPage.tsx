import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { assetTypes } from "../lib/constants";
import { useWorkspaceStore } from "../store/workspaceStore";
import type { CareerAssetType } from "../types";

export function AssetsPage() {
  const careerAssets = useWorkspaceStore((state) => state.careerAssets);
  const upsertCareerAsset = useWorkspaceStore((state) => state.upsertCareerAsset);
  const [type, setType] = useState<CareerAssetType>(assetTypes[0]);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

  const grouped = useMemo(
    () => assetTypes.map((assetType) => ({ assetType, items: careerAssets.filter((item) => item.type === assetType) })),
    [careerAssets]
  );

  return (
    <div>
      <PageHeader
        title="职业资产回流"
        description="把岗位要求、面试题和复盘结论沉淀成可复用知识，越用越懂你的职业脉络。"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel space-y-3">
          <h3 className="text-base font-semibold">手动添加资产</h3>
          <div>
            <label className="label">类型</label>
            <select className="field" value={type} onChange={(e) => setType(e.target.value as CareerAssetType)}>
              {assetTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">标题</label>
            <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">内容</label>
            <textarea className="field min-h-32" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div>
            <label className="label">标签</label>
            <input className="field" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="用逗号分隔" />
          </div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!form.title.trim()) return;
                await upsertCareerAsset({
                type,
                title: form.title.trim(),
                content: form.content.trim(),
                tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean)
              });
              setForm({ title: "", content: "", tags: "" });
            }}
          >
            保存资产
          </button>
        </section>

        <section className="space-y-4">
          {careerAssets.length === 0 ? (
            <EmptyState
              title="还没有职业资产"
              description="当你保存面试复盘或手动添加素材后，这里会自动堆起来，方便后续检索和复用。"
            />
          ) : (
            grouped.map((group) => (
              <div key={group.assetType} className="panel">
                <h3 className="mb-3 text-base font-semibold">{group.assetType}</h3>
                <div className="grid gap-3">
                  {group.items.map((item) => (
                    <article key={item.id} className="rounded-md border border-ink/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{item.title}</p>
                        <span className="text-xs text-ink/45">{item.tags.join(" / ")}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/60">{item.content}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
