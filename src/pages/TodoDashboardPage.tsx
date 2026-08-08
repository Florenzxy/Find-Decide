import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Input, Select } from "../components/ui";
import { addTodo, completeTodo, deleteTodo, loadTodos } from "../db/db";
import { cn } from "../lib/utils";
import type { Todo, TodoPriority } from "../types/schema";

const priorityLabels: Record<TodoPriority, string> = {
  URGENT: "紧急",
  NORMAL: "较急",
  LOW: "不急"
};

const priorityOrder: Record<TodoPriority, number> = {
  URGENT: 0,
  NORMAL: 1,
  LOW: 2
};

const priorityBadgeClass: Record<TodoPriority, string> = {
  URGENT: "bg-rose-100 text-rose-700",
  NORMAL: "bg-orange-100 text-orange-700",
  LOW: "bg-slate-100 text-slate-600"
};

const priorityCalendarClass: Record<TodoPriority, string> = {
  URGENT: "border-rose-200 bg-rose-50 text-rose-700",
  NORMAL: "border-orange-200 bg-orange-50 text-orange-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600"
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
}

function formatDisplayDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ dateKey: string; day: number } | null> = [];

  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: toDateKey(new Date(year, month, day)) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function sortTodoItems(items: Todo[]) {
  return [...items].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority] || a.createdAt.localeCompare(b.createdAt);
  });
}

export function TodoDashboardPage() {
  const today = useMemo(() => toDateKey(new Date()), []);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("NORMAL");

  async function refreshTodos() {
    setTodos(await loadTodos());
  }

  useEffect(() => {
    void refreshTodos();
  }, []);

  const calendarMetrics = useMemo(() => {
    const metrics = new Map<string, { count: number; hasUrgent: boolean }>();

    todos.forEach((todo) => {
      const current = metrics.get(todo.date) ?? { count: 0, hasUrgent: false };
      metrics.set(todo.date, {
        count: current.count + 1,
        hasUrgent: current.hasUrgent || (!todo.isCompleted && todo.priority === "URGENT")
      });
    });

    return metrics;
  }, [todos]);

  const todosByDate = useMemo(() => {
    const groups = new Map<string, Todo[]>();

    todos.forEach((todo) => {
      groups.set(todo.date, sortTodoItems([...(groups.get(todo.date) ?? []), todo]));
    });

    return groups;
  }, [todos]);

  const monthCells = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const selectedTodos = useMemo(() => sortTodoItems(todos.filter((todo) => todo.date === selectedDate)), [selectedDate, todos]);
  const selectedOpenCount = selectedTodos.filter((todo) => !todo.isCompleted).length;

  async function handleAddTodo() {
    const saved = await addTodo({ content, date: selectedDate, priority });
    if (!saved) return;
    setContent("");
    await refreshTodos();
  }

  async function handleComplete(todoId?: string | number) {
    if (todoId === undefined) return;
    await completeTodo(todoId);
    await refreshTodos();
  }

  async function handleDelete(todoId?: string | number) {
    if (todoId === undefined) return;
    await deleteTodo(todoId);
    await refreshTodos();
  }

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-moss">本地优先 · 日历计划</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink">待办工作台</h1>
        </div>
        <p className="max-w-xl text-sm text-ink/60">日历直接展示每天的待办内容，点击日期后在右侧处理当日任务。</p>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.85fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900">{formatMonthTitle(visibleMonth)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="h-8 w-8 rounded-lg px-0" onClick={() => changeMonth(-1)} aria-label="上个月">
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                className="h-8 rounded-lg px-3"
                onClick={() => {
                  const now = new Date();
                  setVisibleMonth(now);
                  setSelectedDate(toDateKey(now));
                }}
              >
                今天
              </Button>
              <Button variant="secondary" className="h-8 w-8 rounded-lg px-0" onClick={() => changeMonth(1)} aria-label="下个月">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-500">
            {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
              <div key={weekday} className="py-1">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {monthCells.map((cell, index) => {
              if (!cell) return <div key={`blank-${index}`} className="min-h-[84px] rounded-lg bg-slate-50/60" />;

              const metric = calendarMetrics.get(cell.dateKey);
              const dayTodos = todosByDate.get(cell.dateKey) ?? [];
              const previewTodos = dayTodos.slice(0, 3);
              const isToday = cell.dateKey === today;
              const isSelected = cell.dateKey === selectedDate;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  className={cn(
                    "min-h-[84px] rounded-lg border p-1.5 text-left transition",
                    isSelected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-400",
                    !isSelected && isToday && "border-slate-900",
                    !isSelected && metric?.hasUrgent && "bg-rose-50"
                  )}
                  onClick={() => setSelectedDate(cell.dateKey)}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{cell.day}</span>
                    <div className="flex items-center gap-1">
                      {metric ? (
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600")}>
                          {metric.count}
                        </span>
                      ) : null}
                      {isToday ? (
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", isSelected ? "bg-white/20 text-white" : "bg-slate-900 text-white")}>
                          今
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {previewTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className={cn(
                          "truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-4",
                          isSelected && !todo.isCompleted && "border-white/15 bg-white/10 text-white",
                          isSelected && todo.isCompleted && "border-white/10 bg-white/5 text-white/60 line-through",
                          !isSelected && !todo.isCompleted && priorityCalendarClass[todo.priority],
                          !isSelected && todo.isCompleted && "border-slate-200 bg-slate-50 text-slate-400 line-through"
                        )}
                        title={todo.content}
                      >
                        {todo.content}
                      </div>
                    ))}
                    {dayTodos.length > previewTodos.length ? (
                      <div className={cn("text-[11px]", isSelected ? "text-white/70" : "text-slate-400")}>+{dayTodos.length - previewTodos.length} 项</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:min-h-full">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">当日任务</h2>
                <p className="mt-0.5 text-sm text-slate-500">{formatDisplayDate(selectedDate)}</p>
              </div>
              <Badge className="bg-slate-900 text-white">
                {selectedOpenCount} 项待办 / {selectedTodos.length} 项
              </Badge>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_96px_auto] xl:grid-cols-[1fr_90px_auto]">
              <Input
                className="h-9 rounded-lg"
                value={content}
                placeholder="例如：复习 SQL 窗口函数"
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleAddTodo();
                }}
              />
              <Select className="h-9 rounded-lg" value={priority} onChange={(event) => setPriority(event.target.value as TodoPriority)}>
                <option value="URGENT">紧急</option>
                <option value="NORMAL">较急</option>
                <option value="LOW">不急</option>
              </Select>
              <Button className="h-9 rounded-lg px-3" onClick={() => void handleAddTodo()} disabled={!content.trim()}>
                <Plus size={16} />
                添加
              </Button>
            </div>

            {selectedTodos.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                这一天还没有任务。
              </p>
            ) : (
              <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {selectedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5",
                      todo.isCompleted ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 bg-white"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label={`完成任务 ${todo.content}`}
                      checked={todo.isCompleted}
                      disabled={todo.isCompleted}
                      onChange={() => {
                        if (!todo.isCompleted) void handleComplete(todo.id);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("truncate text-sm font-medium", todo.isCompleted ? "text-slate-400 line-through" : "text-slate-900")}>
                          {todo.content}
                        </p>
                        <Badge className={todo.isCompleted ? "bg-slate-100 text-slate-500" : priorityBadgeClass[todo.priority]}>
                          {todo.isCompleted ? "已完成" : priorityLabels[todo.priority]}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      className="h-8 w-8 shrink-0 rounded-lg px-0 text-rose-600"
                      aria-label={`删除任务 ${todo.content}`}
                      onClick={() => void handleDelete(todo.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
