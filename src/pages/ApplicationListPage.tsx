import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownAZ, ArrowUpAZ, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Drawer } from "../components/Drawer";
import { Modal } from "../components/Modal";
import { Badge, Button, Input, Select, Textarea } from "../components/ui";
import { DATA_CHANGED_EVENT } from "../lib/dataSync";
import { cn, todayDate } from "../lib/utils";
import { useApplicationStore } from "../store/useApplicationStore";
import {
  ApplicationInputSchema,
  SelfAssessmentSchema,
  type Application,
  type ApplicationStatus,
  type SelfAssessment
} from "../types/schema";

type FormState = {
  companyName: string;
  roleName: string;
  location: string;
  applicationUrl: string;
  appliedAt: string;
  status: ApplicationStatus;
  selfAssessment: SelfAssessment;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const statusOptions: ApplicationStatus[] = [
  "准备中",
  "已投递",
  "笔试中",
  "面试中",
  "一面中",
  "二面中",
  "三面中",
  "N面中",
  "HR面中",
  "Offer",
  "已拒绝",
  "已归档"
];
const pageSize = 10;
const defaultCompanyNature: SelfAssessment = "\u6c11\u8425\u4f01\u4e1a";

function normalizeCompanyNature(value?: string): SelfAssessment {
  return SelfAssessmentSchema.options.includes(value as SelfAssessment) ? (value as SelfAssessment) : defaultCompanyNature;
}

const initialForm = (): FormState => ({
  companyName: "",
  roleName: "",
  location: "",
  applicationUrl: "",
  appliedAt: todayDate(),
  status: "已投递",
  selfAssessment: defaultCompanyNature,
  notes: ""
});

function RequiredMark() {
  return <span className="ml-1 text-rose-500">*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

function statusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case "面试中":
    case "一面中":
    case "二面中":
    case "三面中":
    case "N面中":
    case "HR面中":
      return "bg-sky-100 text-sky-700";
    case "Offer":
      return "bg-emerald-100 text-emerald-700";
    case "已拒绝":
    case "已归档":
      return "bg-slate-100 text-slate-600";
    case "笔试中":
      return "bg-indigo-100 text-indigo-700";
    case "准备中":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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

export function ApplicationListPage() {
  const applications = useApplicationStore((state) => state.applications);
  const fetchApplications = useApplicationStore((state) => state.fetchApplications);
  const addApplication = useApplicationStore((state) => state.addApplication);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"全部" | ApplicationStatus>("全部");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState>(initialForm());
  const [errors, setErrors] = useState<FormErrors>({});

  const refreshAll = useCallback(async () => {
    await fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    void refreshAll();

    const handleDataChanged = () => {
      void refreshAll();
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
  }, [refreshAll]);

  useEffect(() => {
    if (!editing) return;
    setForm({
      companyName: editing.companyName,
      roleName: editing.roleName,
      location: editing.location,
      applicationUrl: editing.applicationUrl,
      appliedAt: editing.appliedAt,
      status: editing.status,
      selfAssessment: normalizeCompanyNature(editing.selfAssessment),
      notes: editing.notes
    });
    setErrors({});
  }, [editing]);

  const queryMatchedApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return applications.filter((item) => `${item.companyName} ${item.roleName}`.toLowerCase().includes(normalizedQuery));
  }, [applications, query]);

  const availableStatuses = useMemo(() => {
    const statusCounts = new Map<ApplicationStatus, number>();
    queryMatchedApplications.forEach((item) => {
      statusCounts.set(item.status, (statusCounts.get(item.status) ?? 0) + 1);
    });

    return statusOptions
      .filter((status) => statusCounts.has(status))
      .map((status) => ({
        status,
        count: statusCounts.get(status) ?? 0
      }));
  }, [queryMatchedApplications]);

  useEffect(() => {
    if (statusFilter !== "全部" && !availableStatuses.some((item) => item.status === statusFilter)) {
      setStatusFilter("全部");
    }
  }, [availableStatuses, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, sortDirection, statusFilter]);

  const filtered = useMemo(() => {
    return applications
      .filter((item) => {
        const matched = `${item.companyName} ${item.roleName}`.toLowerCase().includes(query.trim().toLowerCase());
        const statusMatched = statusFilter === "全部" || item.status === statusFilter;
        return matched && statusMatched;
      })
      .sort((a, b) => {
        const compare = a.appliedAt.localeCompare(b.appliedAt);
        return sortDirection === "desc" ? -compare : compare;
      });
  }, [applications, query, sortDirection, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);

  function openCreateDrawer() {
    setEditing(null);
    setForm(initialForm());
    setErrors({});
    setDrawerOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latestAction = editing ? form.notes.trim() || "编辑投递" : "新建投递";
    const result = ApplicationInputSchema.safeParse({ ...form, latestAction });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        companyName: fieldErrors.companyName?.[0],
        roleName: fieldErrors.roleName?.[0],
        applicationUrl: fieldErrors.applicationUrl?.[0],
        appliedAt: fieldErrors.appliedAt?.[0]
      });
      return;
    }

    setErrors({});
    if (editing) {
      await updateApplication(editing.id, result.data);
    } else {
      await addApplication(result.data);
    }
    await fetchApplications();
    setDrawerOpen(false);
    setEditing(null);
    setForm(initialForm());
  }

  function renderCard(item: Application) {
    const companyNature = normalizeCompanyNature(item.selfAssessment);

    return (
      <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to={`/applications/${item.id}`} className="font-semibold text-slate-900">
              {item.companyName}
            </Link>
            <p className="mt-1 text-sm text-slate-600">{item.roleName}</p>
          </div>
          <Badge className={cn("shrink-0", statusBadgeClass(item.status))}>{item.status}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-400">地点</dt>
            <dd className="mt-1 text-slate-700">{item.location || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">投递日期</dt>
            <dd className="mt-1 text-slate-700">{item.appliedAt}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{"\u4f01\u4e1a\u6027\u8d28"}</dt>
            <dd className="mt-1">
              <Badge className={cn("whitespace-nowrap", companyNatureBadgeClass(companyNature))}>{companyNature}</Badge>
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-400">最近动作</dt>
            <dd className="mt-1 text-slate-700">{item.latestAction || "-"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            aria-label={`编辑 ${item.companyName}`}
            onClick={() => {
              setEditing(item);
              setDrawerOpen(true);
            }}
          >
            <Edit3 size={16} />
            编辑
          </Button>
          <Button
            variant="secondary"
            className="flex-1 text-rose-600"
            aria-label={`删除 ${item.companyName}`}
            onClick={() => setDeleteTarget(item)}
          >
            <Trash2 size={16} />
            删除
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">求职工作台</p>
          <h2 className="mt-1 text-2xl font-semibold">投递列表</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            所有投递一家公司一行，进度状态一目了然。
          </p>
        </div>
        <Button onClick={openCreateDrawer}>
          <Plus size={16} />
          新建投递
        </Button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              className="pl-9"
              placeholder="搜索公司或岗位"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="全部">全部状态</option>
            {availableStatuses.map((item) => (
              <option key={item.status} value={item.status}>
                {item.status}（{item.count}）
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
          >
            {sortDirection === "desc" ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
            投递日期
          </Button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="还没有投递记录"
          description="先新建第一条投递，后面就能进入岗位工作台继续分析 JD、管理简历版本和复盘面试。"
          action={
            <Button onClick={openCreateDrawer}>
              <Plus size={16} />
              去新建
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">{paginated.map(renderCard)}</div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[118px]" />
                <col className="w-[128px]" />
                <col className="w-[80px]" />
                <col className="w-[108px]" />
                <col className="w-[96px]" />
                <col className="w-[188px]" />
                <col className="w-[180px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["公司", "岗位", "地点", "投递日期", "当前状态", "\u4f01\u4e1a\u6027\u8d28", "最近动作", "操作"].map((item) => (
                    <th key={item} className="px-3 py-3">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-4 align-top font-medium">
                      <Link to={`/applications/${item.id}`} className="whitespace-normal break-words text-slate-900 hover:text-slate-600">
                        {item.companyName}
                      </Link>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <Link to={`/applications/${item.id}`} className="whitespace-normal break-words text-slate-600 hover:text-slate-900">
                        {item.roleName}
                      </Link>
                    </td>
                    <td className="px-3 py-4 align-top whitespace-normal break-words text-slate-600">{item.location || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-4 align-top text-slate-600">{item.appliedAt}</td>
                    <td className="px-3 py-4 align-top">
                      <Badge className={statusBadgeClass(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <Badge
                        className={cn(
                          "whitespace-nowrap text-xs",
                          companyNatureBadgeClass(normalizeCompanyNature(item.selfAssessment))
                        )}
                      >
                        {normalizeCompanyNature(item.selfAssessment)}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 align-top whitespace-normal break-words text-slate-600 leading-5">
                      {item.latestAction || "-"}
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          className="h-9 px-3"
                          aria-label={`编辑 ${item.companyName}`}
                          onClick={() => {
                            setEditing(item);
                            setDrawerOpen(true);
                          }}
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-9 px-3 text-rose-600"
                          aria-label={`删除 ${item.companyName}`}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <span>
              每页 {pageSize} 条，当前显示 {pageStart}-{pageEnd} / {filtered.length} 条
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="h-9 px-3" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                上一页
              </Button>
              <span className="min-w-16 text-center text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                className="h-9 px-3"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                下一页
              </Button>
            </div>
          </div>
        </>
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? "编辑投递" : "新建投递"}
        description="公司名、岗位名和投递链接为必填项。提交后会同步保存到本地数据库。"
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
          setErrors({});
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="companyName">
              公司名
              <RequiredMark />
            </label>
            <Input
              id="companyName"
              value={form.companyName}
              aria-invalid={Boolean(errors.companyName)}
              onChange={(event) => {
                setForm((current) => ({ ...current, companyName: event.target.value }));
                setErrors((current) => ({ ...current, companyName: undefined }));
              }}
            />
            <FieldError message={errors.companyName} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="roleName">
              岗位名
              <RequiredMark />
            </label>
            <Input
              id="roleName"
              value={form.roleName}
              aria-invalid={Boolean(errors.roleName)}
              onChange={(event) => {
                setForm((current) => ({ ...current, roleName: event.target.value }));
                setErrors((current) => ({ ...current, roleName: undefined }));
              }}
            />
            <FieldError message={errors.roleName} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="applicationUrl">
              投递链接
              <RequiredMark />
            </label>
            <Input
              id="applicationUrl"
              type="text"
              inputMode="url"
              placeholder="https://example.com/job"
              value={form.applicationUrl}
              aria-invalid={Boolean(errors.applicationUrl)}
              onChange={(event) => {
                setForm((current) => ({ ...current, applicationUrl: event.target.value }));
                setErrors((current) => ({ ...current, applicationUrl: undefined }));
              }}
            />
            <FieldError message={errors.applicationUrl} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="location">
              工作地点
            </label>
            <Input
              id="location"
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="appliedAt">
                投递日期
              </label>
              <Input
                id="appliedAt"
                type="date"
                value={form.appliedAt}
                onChange={(event) => setForm((current) => ({ ...current, appliedAt: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status">
                当前状态
              </label>
              <Select
                id="status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ApplicationStatus }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="selfAssessment">
                {"\u4f01\u4e1a\u6027\u8d28"}
              </label>
              <Select
                id="selfAssessment"
                value={form.selfAssessment}
                onChange={(event) => setForm((current) => ({ ...current, selfAssessment: event.target.value as SelfAssessment }))}
              >
                {SelfAssessmentSchema.options.map((assessment) => (
                  <option key={assessment} value={assessment}>
                    {assessment}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="notes">
              备注
            </label>
            <Textarea
              id="notes"
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setEditing(null);
                setErrors({});
              }}
            >
              取消
            </Button>
            <Button type="submit">{editing ? "保存修改" : "创建投递"}</Button>
          </div>
        </form>
      </Drawer>

      <Modal
        open={Boolean(deleteTarget)}
        title="删除投递"
        description="确定要删除该公司的投递记录吗？此操作不可恢复"
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteApplication(deleteTarget.id);
          await fetchApplications();
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
