"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  KeyRound,
  Settings,
  LogOut,
  Database,
  Terminal,
  BarChart3,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { FloatingDock } from "@/components/ui/floating-dock";

interface OverviewData {
  user: {
    id: string;
    email: string;
    plan: string;
  };
  connection: {
    connected: boolean;
    email: string | null;
    status: string;
  };
  usage: {
    usedBytes: number;
    limitBytes: number;
    percentage: number;
  };
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/objects": "Objects",
  "/keys": "API keys",
  "/playground": "Playground",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/docs": "Documentation",
  "/admin": "Admin",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOverview(data);
      })
      .catch(() => { });
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      if (!response.ok) throw new Error("Sign out failed.");
    } catch {
      window.alert("Could not sign out. Please try again.");
      return;
    }
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: Database, matchExact: true },
    { label: "Objects", href: "/objects", icon: Folder, matchExact: false },
    { label: "API keys", href: "/keys", icon: KeyRound, matchExact: false },
    { label: "Playground", href: "/playground", icon: Terminal, matchExact: false },
    { label: "Analytics", href: "/analytics", icon: BarChart3, matchExact: false },
    { label: "Settings", href: "/settings", icon: Settings, matchExact: false },
  ];

  const floatingDockItems = navItems.map((item) => ({
    title: item.label,
    icon: <item.icon className="w-5 h-5" />,
    href: item.href,
    matchExact: item.matchExact,
  }));

  const currentTitle = PAGE_TITLES[pathname] || "Workspace";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Toaster theme="dark" richColors position="top-right" />

      {/* TOP HEADER - CLEAN LOGIN THEME */}
      <header className="sticky top-0 z-40 h-14 bg-stone-950/90 backdrop-blur border-b border-stone-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-stone-100">
            <Layers className="text-emerald-400 w-5 h-5" /> byos.
          </Link>
          <span className="hidden sm:inline text-xs font-medium text-stone-400">
            Workspace / {currentTitle}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {overview?.connection.connected ? (
            <div className="hidden md:flex items-center gap-2 text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="truncate max-w-[200px]">{overview.connection.email}</span>
            </div>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-400 text-stone-950 px-2.5 py-1 rounded-lg hover:bg-emerald-300 transition-colors"
            >
              Connect Drive <ArrowUpRight size={12} />
            </Link>
          )}

          <div className="flex items-center gap-3 pl-3 border-l border-stone-800">
            <span className="text-stone-300 text-xs font-mono truncate max-w-[150px]">
              {overview?.user.email || ""}
            </span>
            <button
              onClick={handleLogout}
              className="text-stone-400 hover:text-stone-100 transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* BODY WITH SIDEBAR AND MAIN CONTENT */}
      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-60 shrink-0 bg-stone-950 border-r border-stone-800 p-4 hidden md:flex flex-col justify-between min-h-[calc(100vh-56px)]">
          <div className="space-y-6">
            <div className="text-xs font-medium text-stone-400 px-3 py-1 flex items-center justify-between border-b border-stone-800/60 pb-3">
              <span>Personal workspace</span>
              <span className="text-stone-500">⌄</span>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = item.matchExact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-stone-900 text-emerald-400"
                        : "text-stone-400 hover:text-stone-100 hover:bg-stone-900/60"
                    }`}
                  >
                    <Icon size={16} className={isSelected ? "text-emerald-400" : "text-stone-400"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider px-3 mb-2">
                Connected Storage
              </div>
              {overview?.connection.connected ? (
                <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Google Drive</span>
                </div>
              ) : (
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-400 hover:bg-stone-900/60 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Connect Drive</span>
                </Link>
              )}
            </div>

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider px-3 mb-2">
                Developers
              </div>
              <Link
                href="/docs"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith("/docs")
                    ? "bg-stone-900 text-emerald-400"
                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-900/60"
                }`}
              >
                <Terminal size={16} />
                <span>Documentation</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* MAIN VIEW */}
        <main className="flex-1 min-w-0 p-6 md:p-10 max-w-6xl mx-auto w-full">
          {/* Mobile Dock */}
          <div className="p-2 md:hidden mb-4">
            <FloatingDock items={floatingDockItems} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
