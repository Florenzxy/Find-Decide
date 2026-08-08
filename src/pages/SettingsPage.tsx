import { type ChangeEvent, useRef, useState } from "react";
import { DatabaseBackup, Download, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Modal } from "../components/Modal";
import { Button, Input } from "../components/ui";
import { useApplicationStore } from "../store/useApplicationStore";
import { BackupSchema } from "../types/schema";

function parseErrorMessage(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const firstIssue = error.issues[0];
  if (!firstIssue) return "文件格式不正确";
  const path = firstIssue.path.length > 0 ? `${firstIssue.path.join(".")}：` : "";
  return `文件格式不正确：${path}${firstIssue.message}`;
}

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportData = useApplicationStore((state) => state.exportData);
  const importData = useApplicationStore((state) => state.importData);
  const clearAllData = useApplicationStore((state) => state.clearAllData);
  const storeLoading = useApplicationStore((state) => state.loading);

  const [busy, setBusy] = useState<"export" | "import" | "clear" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearPhrase, setClearPhrase] = useState("");

  const isWorking = storeLoading || busy !== null;

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2000);
  }

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleExport() {
    setBusy("export");
    setError("");
    try {
      await exportData();
      showNotice("导出成功");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导出失败");
    } finally {
      setBusy(null);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setNotice("");
    setError("");
    setPendingFile(null);

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("文件格式不正确：请上传 .json 备份文件");
      resetFileInput();
      return;
    }

    setBusy("import");
    try {
      let json: unknown;

      try {
        json = JSON.parse(await file.text());
      } catch {
        throw new Error("文件格式不正确：请上传有效的 JSON 文件");
      }

      const result = BackupSchema.safeParse(json);
      if (!result.success) {
        throw new Error(parseErrorMessage(result.error));
      }

      setPendingFile(file);
      setImportConfirmOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "文件格式不正确");
      resetFileInput();
    } finally {
      setBusy(null);
    }
  }

  async function handleImportConfirm() {
    if (!pendingFile || isWorking) return;

    setBusy("import");
    setError("");
    try {
      const result = await importData(pendingFile);
      setImportConfirmOpen(false);
      setPendingFile(null);
      resetFileInput();
      showNotice(
        result.warnings.length > 0
          ? `导入成功，已跳过 ${Object.values(result.skipped).reduce((total, count) => total + count, 0)} 条孤立记录`
          : "导入成功，数据已恢复"
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入失败");
    } finally {
      setBusy(null);
    }
  }

  async function handleClearConfirm() {
    if (isWorking) return;
    if (clearPhrase !== "确认清空") {
      setError("请输入“确认清空”后再执行");
      return;
    }

    setBusy("clear");
    setError("");
    try {
      await clearAllData();
      setClearConfirmOpen(false);
      setClearPhrase("");
      showNotice("本地数据已清空");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "清空失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-slate-500">数据管理</p>
        <h2 className="mt-1 text-2xl font-semibold">本地数据中心</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          简历、JD、面试复盘和准备清单保存在本机浏览器内。建议在重要节点导出一份完整备份。
        </p>
      </header>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
              <DatabaseBackup size={20} />
            </div>
            <div>
              <h3 className="font-semibold">导出数据</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">生成一个包含所有投递、JD、简历版本、知识准备和面试复盘的 JSON 文件。</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isWorking}>
            <Download size={16} />
            {busy === "export" ? "正在导出..." : "导出完整备份"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="font-semibold">导入数据</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">上传备份文件后会先检查格式，确认后覆盖当前本地数据库。</p>
            </div>
          </div>
          <Input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileChange} disabled={isWorking} />
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-rose-700">清空数据</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">删除当前浏览器里的所有投递记录和岗位工作台内容。</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => setClearConfirmOpen(true)} disabled={isWorking}>
            <Trash2 size={16} />
            {busy === "clear" ? "正在清空..." : "清空所有数据"}
          </Button>
        </div>
      </section>

      <Modal
        open={importConfirmOpen}
        title="确认导入备份"
        description="这将覆盖当前所有数据，确定继续吗？"
        confirmLabel={busy === "import" ? "正在导入..." : "确认导入"}
        onClose={() => {
          if (isWorking) return;
          setImportConfirmOpen(false);
          setPendingFile(null);
          resetFileInput();
        }}
        onConfirm={handleImportConfirm}
      >
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <ShieldCheck size={16} />
          {pendingFile?.name}
        </div>
      </Modal>

      <Modal
        open={clearConfirmOpen}
        title="清空所有数据"
        description="确定要清空所有本地数据吗？此操作不可恢复。"
        danger
        confirmLabel={busy === "clear" ? "正在清空..." : "确认清空"}
        onClose={() => {
          if (!isWorking) {
            setClearConfirmOpen(false);
            setClearPhrase("");
          }
        }}
        confirmDisabled={clearPhrase !== "确认清空"}
        onConfirm={handleClearConfirm}
      >
        <label className="block text-sm font-medium text-slate-700">
          请输入“确认清空”
          <Input
            className="mt-2"
            value={clearPhrase}
            onChange={(event) => setClearPhrase(event.target.value)}
            placeholder="确认清空"
            autoComplete="off"
          />
        </label>
      </Modal>
    </div>
  );
}
