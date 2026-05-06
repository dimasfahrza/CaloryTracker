"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UtensilsCrossed, Scale, Dumbbell, BarChart3, Settings, LogOut, Flame,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/food", label: "Food log", icon: UtensilsCrossed },
  { href: "/weight", label: "Weight", icon: Scale },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 bg-surface border-r border-border p-4">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <span className="font-semibold">CaloryTracker</span>
      </Link>

      <nav className="mt-6 flex flex-col gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                active ? "bg-surface2 text-text" : "text-muted hover:text-text hover:bg-surface2",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <div className="px-3 py-2 text-xs text-muted truncate">{userName}</div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-text hover:bg-surface2"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
