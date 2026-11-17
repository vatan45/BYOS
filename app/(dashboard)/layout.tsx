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
    <div className="app-shell">
      <Toaster theme="dark" richColors position="top-right" />

      {/* TOP HEADER - EXACT LANDING PREVIEW STYLE */}
      <header className="preview-top">
        <Link href="/dashboard" className="wordmark">
          <span className="brand-symbol">
            <Layers size={18} />
          </span>{" "}
          byos<span className="brand-dot">.</span>
        </Link>
        <span className="hidden sm:inline text-xs text-[#919a8e]">
          Workspace / {currentTitle}
        </span>
        <div className="flex items-center gap-4 text-xs">
          {overview?.connection.connected ? (
            <div className="hidden md:flex items-center gap-2 text-[#929a8d]">
              <span className="status-dot" />
              <span className="truncate max-w-[200px]">{overview.connection.email}</span>
            </div>
          ) : (
            <Link href="/settings" className="action small text-xs !py-1 !px-2.5">
              Connect Drive <ArrowUpRight size={12} />
            </Link>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-[#292d29]">
            <span className="text-[#d3d9cc] text-xs font-mono truncate max-w-[140px]">
              {overview?.user.email || ""}
            </span>
            <button
              onClick={handleLogout}
              className="text-[#929a8d] hover:text-[#f0f2eb] transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* BODY WITH SIDEBAR AND CONTENT */}
      <div className="preview-body">
        {/* SIDEBAR */}
        <aside className="preview-sidebar hidden md:block">
          <span className="preview-workspace">
            Personal workspace <span>⌄</span>
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isSelected ? "selected" : ""}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <small>CONNECTED STORAGE</small>
          {overview?.connection.connected ? (
            <div>
              <span className="status-dot" /> Google Drive
            </div>
          ) : (
            <Link href="/settings">
              <span className="status-dot" style={{ background: "#f59e0b" }} /> Connect Drive
            </Link>
          )}

          <small>DEVELOPERS</small>
          <Link
            href="/docs"
            className={pathname.startsWith("/docs") ? "selected" : ""}
          >
            <Terminal size={15} />
            <span>Documentation</span>
          </Link>
        </aside>

        {/* MAIN VIEW */}
        <main className="preview-content">
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
