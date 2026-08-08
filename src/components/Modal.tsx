import type { ReactNode } from "react";
import { Button } from "./ui";

export function Modal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
  showCancel = true,
  confirmDisabled = false,
  panelClassName = "",
  children
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  showCancel?: boolean;
  confirmDisabled?: boolean;
  panelClassName?: string;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
      <div className={`w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ${panelClassName}`}>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          {showCancel ? (
            <Button variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button variant={danger ? "danger" : "default"} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
