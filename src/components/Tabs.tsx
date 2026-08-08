import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Tabs({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{children}</div>;
}

export function TabsTrigger({
  value,
  currentValue,
  onValueChange,
  children
}: {
  value: string;
  currentValue: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  const active = value === currentValue;

  return (
    <button
      type="button"
      aria-selected={active}
      className={cn(
        "h-10 rounded-xl px-4 text-sm font-medium transition",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsPanel({
  value,
  currentValue,
  children
}: {
  value: string;
  currentValue: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" hidden={value !== currentValue}>
      {children}
    </div>
  );
}
