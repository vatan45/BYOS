"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Folder,
  KeyRound,
  Settings,
  LogOut,
  ChevronRight,
  Database,
  Terminal,
  BarChart3,
  Layers,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { FloatingDock } from "@/components/ui/floating-dock";
import { Button } from "@/components/ui/button";

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
      .catch(() => {});
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

  return (
    <div className="console-shell min-h-screen bg-stone-950 text-stone-100 flex flex-col md:flex-row font-sans antialiased selection:bg-emerald-400 selection:text-stone-950">
      <Toaster theme="dark" richColors position="top-right" />

      {/* DESKTOP SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0c0e0d] border-r border-stone-800/80 flex flex-col z-20 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-800/80">
          <Link href="/dashboard" className="flex items-center space-x-2.5 group">
            <span className="text-emerald-400 flex items-center justify-center">
              <Layers size={20} />
            </span>
            <span className="text-xl font-semibold tracking-tight text-white">
              byos<span className="text-emerald-400">.</span>
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto hidden md:block">
          <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-stone-500 font-mono">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                aria-current={isActive ? "page" : undefined}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all group ${
                  isActive
                    ? "bg-stone-900 text-emerald-400 font-medium"
                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-900/60"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? "text-emerald-400"
                        : "text-stone-400 group-hover:text-stone-200"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </Link>
            );
          })}

          <Separator className="my-4 bg-stone-800/80" />

          <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-stone-500 font-mono">
            Developers
          </div>
          <Link
            href="/docs"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
              pathname === "/docs"
                ? "bg-stone-900 text-emerald-400"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Terminal className="w-4 h-4 text-stone-400" />
              <span>Documentation</span>
            </div>
            {pathname === "/docs" ? (
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
            )}
          </Link>
        </nav>

        {/* User Footer Card */}
        <div className="p-4 border-t border-stone-800/80 bg-[#0c0e0d]">
          <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <Avatar className="h-7 w-7 border border-stone-700 bg-stone-800">
                <AvatarFallback className="text-[10px] font-mono font-medium text-emerald-400 bg-stone-900">
                  {(overview?.user.email || "US").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-200 truncate">
                  {overview?.user.email || "Loading account…"}
                </p>
                <span className="text-[10px] font-mono text-stone-400 uppercase">
                  {overview?.user.plan || "free"}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
              className="h-7 w-7 text-stone-400 hover:text-stone-100 hover:bg-stone-800 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0e0d]">
        {/* Top bar */}
        <header className="h-14 px-6 sm:px-8 border-b border-stone-800/80 bg-[#0c0e0d]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-stone-400">
            <span className="font-medium text-stone-300">Console</span>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            {overview?.connection.connected ? (
              <div className="px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-stone-300 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[200px]">
                  Google Drive: {overview.connection.email}
                </span>
              </div>
            ) : (
              <Link href="/settings">
                <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer font-medium">
                  Connect Google Drive
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Floating Dock */}
        <div className="p-4 md:hidden">
          <FloatingDock items={floatingDockItems} />
        </div>

        {/* Dynamic View Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
