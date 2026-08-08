import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { applicationStatuses, priorities } from "../lib/constants";
import { useWorkspaceStore } from "../store/workspaceStore";
import type { ApplicationStatus, Priority } from "../types";

export function ApplicationsPage() {
  const applications = useWorkspaceStore((state) => state.applications);
  const createApplication = useWorkspaceStore((state) => state.createApplication);
  const updateApplication = useWorkspaceStore((state) => state.updateApplication);
  const deleteApplication = useWorkspaceStore((state) => state.deleteApplication);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [priorityFilter, setPriorityFilter] = useState("全部");
  const [form, setForm] = useState({
    company: "",
    role: "",
    status: "准备中" as ApplicationStatus,
    priority: "中" as Priority,
    location: "",
    salaryRange: "",
    notes: ""
  });

  const filtered = useMemo(() => {
    return applications.filter((item) => {
      const matched =
        `${item.company} ${item.role} ${item.location ?? ""} ${item.notes ?? ""}`.toLowerCase().includes(query.toLowerCase());
      const statusOk = statusFilter === "全部" || item.status === statusFilter;
      const priorityOk = priorityFilter === "全部" || item.priority === priorityFilter;
      return matched && statusOk && priorityOk;
    });
  }, [applications, priorityFilter, query, statusFilter]);

  return (
    <div>
      <PageHeader
        title="求职工作台"
        description="所有投递一家公司一行，进度状态一目了然。这里是你从收集岗位到拿到 offer 的主控台。"
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_2fr]">
        <section className="panel space-y-4">
          <h3 className="text-base font-semibold">新建投递</h3>
          <div className="grid gap-3">
            <div>
              <label className="label" htmlFor="company-input">
                公司
              </label>
              <input
                id="company-input"
                className="field"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="role-input">
                岗位
              </label>
              <input id="role-input" className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">状态</label>
                <select
                  className="field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}
                >
                  {applicationStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">优先级</label>
                <select
                  className="field"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">地点</label>
                <input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="label">薪资</label>
                <input className="field" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">备注</label>
              <textarea className="field min-h-24" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!form.company.trim() || !form.role.trim()) return;
                  await createApplication({
                    company: form.company.trim(),
                    role: form.role.trim(),
                    status: form.status,
                    priority: form.priority,
                    location: form.location.trim(),
                    salaryRange: form.salaryRange.trim(),
                    notes: form.notes.trim()
                  });
                setForm({ company: "", role: "", status: "准备中", priority: "中", location: "", salaryRange: "", notes: "" });
              }}
            >
              <Plus size={16} />
              创建投递
            </button>
          </div>
        </section>

        <section className="panel space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-ink/35" size={16} />
              <input className="field pl-9" placeholder="搜索公司、岗位、备注" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>全部</option>
              {applicationStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select className="field" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option>全部</option>
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="还没有投递记录"
              description="先创建一个公司和岗位，后面就能进入单独的岗位工作间继续分析、记录和回流知识。"
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-ink/10">
              <table className="w-full border-collapse bg-white text-sm">
                <thead className="bg-ink/5 text-left text-xs uppercase tracking-wide text-ink/55">
                  <tr>
                    <th className="px-4 py-3">公司 / 岗位</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">优先级</th>
                    <th className="px-4 py-3">地点</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-t border-ink/10">
                      <td className="px-4 py-3">
                        <Link to={`/applications/${item.id}`} className="font-semibold text-moss hover:underline">
                          {item.company}
                        </Link>
                        <div className="text-xs text-ink/55">{item.role}</div>
                      </td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.priority}</td>
                      <td className="px-4 py-3">{item.location || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-secondary" onClick={() => updateApplication(item.id, { status: "面试" })}>
                            标记面试
                          </button>
                          <button className="btn btn-danger" onClick={() => deleteApplication(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
