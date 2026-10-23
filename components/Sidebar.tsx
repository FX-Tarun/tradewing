"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  NotebookPen,
  History,
  CalendarDays,
  Settings,
  Target,
} from "lucide-react";

const navigation = [
  {
    label: "MISSION",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "EXECUTION",
    items: [
      { name: "Checklist", href: "/checklist", icon: CheckSquare },
      { name: "Journal", href: "/journal", icon: NotebookPen },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { name: "Review", href: "/review", icon: History },
      { name: "Sunday planning", href: "/sunday-planning", icon: CalendarDays },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-[calc(100vh-80px)] w-[220px] shrink-0 flex-col overflow-y-auto border-r border-[#142A3D] bg-[#050B11] px-5 py-5">
      {/* Navigation */}
      <nav className="space-y-6">
        {navigation.map((section) => (
          <div key={section.label}>
            <div className="mb-2.5 px-2 text-[11px] font-extrabold tracking-[0.12em] text-[#5680A2]">
              {section.label}
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[15px] font-extrabold transition-all duration-200 ${
                      active
                        ? "border-[#0C78C8]/70 bg-[#0D2A41] text-white shadow-[0_0_0_1px_rgba(21,155,255,0.12)]"
                        : "border-transparent text-slate-400 hover:bg-[#091722] hover:text-slate-200"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                      className={active ? "text-[#159BFF]" : "text-slate-500"}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Today's Focus */}
      <div className="mt-auto pt-6">
        <div className="mb-3 rounded-xl border border-[#0C78C8] bg-[#071522] p-4">
          <Target size={20} className="text-[#159BFF]" />

          <div className="mt-3 text-[11px] font-bold text-slate-400">
            Today&apos;s Focus
          </div>

          <div className="mt-1 text-[18px] font-extrabold text-[#159BFF]">
            Discipline
          </div>

          <div className="mt-2 text-[13px] font-bold leading-5 text-slate-300">
            One setup.
            <br />
            Maximum quality.
          </div>
        </div>

        <div className="mb-2.5 px-2 text-[11px] font-extrabold tracking-[0.12em] text-[#5680A2]">
          SYSTEM
        </div>

        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[15px] font-extrabold transition-all duration-200 ${
            pathname === "/settings"
              ? "border-[#0C78C8]/70 bg-[#0D2A41] text-white"
              : "border-transparent text-slate-400 hover:bg-[#091722] hover:text-slate-200"
          }`}
        >
          <Settings
            size={18}
            strokeWidth={1.8}
            className={pathname === "/settings" ? "text-[#159BFF]" : "text-slate-500"}
          />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}