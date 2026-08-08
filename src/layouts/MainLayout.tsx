import { BarChart3, BriefcaseBusiness, ClipboardList, Database, FileText, ListChecks } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "../lib/utils";

const links = [
  { to: "/todos", label: "待办工作台", icon: ClipboardList },
  { to: "/applications", label: "求职工作台", icon: BriefcaseBusiness },
  { to: "/resumes", label: "个人简历库", icon: FileText },
  { to: "/offers", label: "Offer 决策助手", icon: BarChart3 },
  { to: "/settings/data", label: "数据管理", icon: Database }
];

export function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
                <ListChecks size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Find & Decide</p>
                <h1 className="text-lg font-semibold">AI 求职工作台</h1>
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <nav className="space-y-1">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"
                    )
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
