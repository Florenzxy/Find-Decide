import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, Download, Eye, FileText, Star, Trash2, Upload, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button } from "../components/ui";
import { addResumeRecord, deleteResumeRecord, loadResumes, setDefaultResume } from "../db/db";
import { DATA_CHANGED_EVENT } from "../lib/dataSync";
import { extractPdfText } from "../services/pdfService";
import type { Resume } from "../types/schema";

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("无法读取简历文件"));
        return;
      }

      const [, base64] = reader.result.split(",");
      if (!base64) {
        reject(new Error("简历文件内容为空"));
        return;
      }

      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取简历文件失败"));
    reader.readAsDataURL(file);
  });
}

function downloadResume(resume: Resume) {
  if (resume.id === undefined) return;

  const binary = atob(resume.fileContent);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = resume.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resumePdfUrl(resume: Resume) {
  return `data:application/pdf;base64,${resume.fileContent}`;
}

function formatUploadDate(value: string) {
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

export function ResumeLibraryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Resume | null>(null);

  const refreshResumes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResumes(await loadResumes());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取简历库失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshResumes();

    const handleDataChanged = () => {
      void refreshResumes();
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
  }, [refreshResumes]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setNotice("");
    setError("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("仅支持上传 PDF 简历");
      return;
    }

    setBusyAction("upload");
    try {
      const fileContent = await readFileAsBase64(file);
      const extractedText = await extractPdfText(file).catch(() => "");
      await addResumeRecord({ fileName: file.name, fileContent, extractedText });
      await refreshResumes();
      showNotice("简历已上传");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传简历失败");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSetDefault(resume: Resume) {
    if (resume.id === undefined || resume.isDefault) return;

    setBusyAction(`default-${resume.id}`);
    setError("");
    try {
      await setDefaultResume(resume.id);
      await refreshResumes();
      showNotice("已设为默认简历");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "设置默认简历失败");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;

    setBusyAction(`delete-${deleteTarget.id}`);
    setError("");
    try {
      await deleteResumeRecord(deleteTarget.id);
      await refreshResumes();
      setDeleteTarget(null);
      showNotice("简历已删除");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除简历失败");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="个人简历库"
        description="集中管理你的 PDF 简历版本。文件只保存在当前浏览器本地，不会上传到服务器。"
        action={
          <>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={busyAction === "upload"}>
              <Upload size={16} />
              {busyAction === "upload" ? "正在上传..." : "上传 PDF 简历"}
            </Button>
          </>
        }
      />

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">正在加载简历库...</div>
      ) : resumes.length === 0 ? (
        <EmptyState
          title="还没有上传简历"
          description="上传一份 PDF 简历，之后可以随时下载或切换默认版本。"
          action={
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              去上传
            </Button>
          }
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => {
            const resumeKey = resume.id ?? `${resume.fileName}-${resume.uploadDate}`;
            const isSettingDefault = busyAction === `default-${resume.id}`;

            return (
              <article key={resumeKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                    <FileText size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="min-w-0 truncate text-left font-semibold text-slate-900 hover:text-slate-600"
                        title={resume.fileName}
                        onClick={() => setPreviewTarget(resume)}
                      >
                        {resume.fileName}
                      </button>
                      {resume.isDefault ? <Badge className="bg-emerald-50 text-emerald-700">默认简历</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">上传于 {formatUploadDate(resume.uploadDate)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={resume.isDefault || Boolean(busyAction)}
                    onClick={() => void handleSetDefault(resume)}
                  >
                    {resume.isDefault ? <Check size={16} /> : <Star size={16} />}
                    {isSettingDefault ? "设置中..." : resume.isDefault ? "当前默认" : "设为默认"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={Boolean(busyAction)}
                    onClick={() => setPreviewTarget(resume)}
                  >
                    <Eye size={16} />
                    预览
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={Boolean(busyAction)}
                    onClick={() => downloadResume(resume)}
                  >
                    <Download size={16} />
                    下载
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-rose-600"
                    aria-label={`删除 ${resume.fileName}`}
                    disabled={Boolean(busyAction)}
                    onClick={() => setDeleteTarget(resume)}
                  >
                    <Trash2 size={16} />
                    删除
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title="删除简历"
        description={`确定要删除“${deleteTarget?.fileName ?? ""}”吗？此操作不可恢复。`}
        danger
        confirmLabel={busyAction?.startsWith("delete-") ? "正在删除..." : "确认删除"}
        onClose={() => {
          if (!busyAction) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />

      {previewTarget ? (
        <div className="fixed inset-0 z-50 bg-slate-900/50 px-3 py-3 sm:px-5 sm:py-5">
          <section className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">简历预览</p>
                <h3 className="truncate text-base font-semibold text-slate-900">{previewTarget.fileName}</h3>
              </div>
              <Button variant="secondary" className="h-9 w-9 shrink-0 px-0" onClick={() => setPreviewTarget(null)}>
                <X size={16} />
              </Button>
            </header>
            <iframe
              className="min-h-0 flex-1 bg-slate-100"
              src={resumePdfUrl(previewTarget)}
              title={`预览 ${previewTarget.fileName}`}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
