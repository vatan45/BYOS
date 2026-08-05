"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Server,
  FolderTree,
  Key,
  Settings,
  LogOut,
  ShieldCheck,
  Activity,
  ChevronRight,
  Database,
  Terminal,
  ExternalLink,
  BarChart3,
  ShieldAlert,
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
    isAdmin?: boolean;
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOverview(data);
      })
      .catch((e) => console.error("Error fetching header metadata:", e));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { label: "Overview & Storage", href: "/dashboard", icon: Server, matchExact: true },
    { label: "S3 Playground", href: "/playground", icon: Terminal, matchExact: false },
    { label: "Object Explorer", href: "/objects", icon: FolderTree, matchExact: false },
    { label: "Analytics & Telemetry", href: "/analytics", icon: BarChart3, matchExact: false },
    { label: "API Secret Keys", href: "/keys", icon: Key, matchExact: false },
    { label: "Connection & Settings", href: "/settings", icon: Settings, matchExact: false },
    ...(overview?.user.isAdmin ? [{ label: "Operator Admin", href: "/admin", icon: ShieldAlert, matchExact: false }] : []),
  ];

  const floatingDockItems = navItems.map((item) => ({
    title: item.label,
    icon: <item.icon className="w-5 h-5" />,
    href: item.href,
    matchExact: item.matchExact,
  }));

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col md:flex-row font-sans antialiased selection:bg-emerald-500 selection:text-stone-950">
      <Toaster theme="dark" richColors position="top-right" />

      {/* DESKTOP PERSISTENT SHADCN SIDEBAR */}
      <aside className="w-full md:w-64 bg-stone-950 border-r border-stone-800/80 flex flex-col z-20 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-800/80">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5 text-stone-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-tight flex items-center space-x-1.5">
                <span>BYOS</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded bg-stone-800 text-stone-300 border-stone-700 font-mono">
                  v1.0
                </Badge>
              </div>
              <p className="text-[11px] text-stone-400 font-mono">S3 over Google Drive</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links (Desktop persistent) */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto hidden md:block">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
            Platform Suite
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchExact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-stone-900 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-bold"
                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-900/50 border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-emerald-400" : "text-stone-500 group-hover:text-stone-300"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
              </Link>
            );
          })}

          <Separator className="my-4 bg-stone-800/80" />

          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
            Developer Docs
          </div>
          <Link
            href="/docs"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              pathname === "/docs"
                ? "bg-stone-900 text-cyan-400 border border-stone-800 shadow-sm"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>S3 SDK & API Reference</span>
            </div>
            {pathname === "/docs" ? (
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
            )}
          </Link>
        </nav>

        {/* User Footer Card */}
        <div className="p-4 border-t border-stone-800/80 bg-stone-950/80">
          <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <Avatar className="h-7 w-7 border border-stone-700 bg-stone-800">
                  <AvatarFallback className="text-[10px] font-mono font-bold text-emerald-400 bg-stone-900">
                    {(overview?.user.email || "US").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-mono font-bold text-stone-200 truncate">
                  {overview?.user.email || "Authenticated User"}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0 font-mono uppercase bg-stone-800 text-cyan-400 border border-stone-700">
                {overview?.user.plan || "PRO"}
              </Badge>
            </div>

            <Separator className="bg-stone-800/80" />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-mono font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Zero-Trust Secured</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out of console"
                className="h-7 w-7 text-stone-400 hover:text-rose-400 hover:bg-stone-800/80"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 px-6 sm:px-8 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-stone-400">
            <span className="font-medium text-stone-300">Console</span>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            {overview?.connection.connected ? (
              <div className="px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-stone-300 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[180px]">Google Drive: {overview.connection.email}</span>
              </div>
            ) : (
              <Link href="/settings">
                <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer font-medium">
                  Connect Google Drive
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Mobile / Tablet Aceternity Floating Dock Navigation */}
        <div className="p-4 md:hidden">
          <FloatingDock items={floatingDockItems} />
        </div>

        {/* Dynamic View Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
