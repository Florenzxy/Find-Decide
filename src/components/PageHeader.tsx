import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-moss">本地优先 · AI 手动协作</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
      </div>
      {action}
    </header>
  );
}
