"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Users,
  HardDrive,
  Activity,
  Lock,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface PlatformTotals {
  totalUsers: number;
  totalBuckets: number;
  totalObjects: number;
  totalStorageProxiedBytes: number;
  totalBandwidthTransferredBytes: number;
  totalRequestsToday: number;
}

interface UserBreakdown {
  id: string;
  email: string;
  plan: string;
  createdAt: string;
  bucketCount: number;
  objectCount: number;
  storageBytes: number;
  bandwidthBytes: number;
  requestCount: number;
}

interface AdminData {
  platformTotals: PlatformTotals;
  userBreakdowns: UserBreakdown[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function OperatorAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error?.message || "Access denied: Operator administrative clearance required.");
      }
    } catch {
      setError("Network fault while retrieving operator telemetry from backend.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        <div className="flex justify-between pb-6 border-b border-stone-800">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-stone-900" />
            <Skeleton className="h-4 w-96 bg-stone-900" />
          </div>
          <Skeleton className="h-10 w-48 bg-stone-900 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full bg-stone-900 rounded-2xl" />
          <Skeleton className="h-32 w-full bg-stone-900 rounded-2xl" />
          <Skeleton className="h-32 w-full bg-stone-900 rounded-2xl" />
          <Skeleton className="h-32 w-full bg-stone-900 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full bg-stone-900 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 rounded-3xl bg-rose-950/20 border-2 border-rose-500/40 text-center space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.15)]">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-white">Operator Access Restricted</h2>
        <p className="text-stone-300 text-sm font-sans leading-relaxed">{error}</p>
        <p className="text-[11px] font-mono text-stone-400 pt-2 border-t border-rose-500/20">
          Tip: Add your email address to the <code className="text-rose-400">ADMIN_EMAILS</code> environment variable inside your <code className="text-rose-400">.env</code> configuration file to unlock this internal operator dashboard.
        </p>
      </div>
    );
  }

  const { platformTotals, userBreakdowns } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <Badge variant="outline" className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs font-mono font-bold uppercase mb-2">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse mr-1.5 shrink-0" />
            Internal Operator Only &mdash; Admin Clearance
          </Badge>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <span>BYOS Global SaaS Telemetry</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Aggregate statistics across all user workspaces, cloud storage proxies, and bandwidth throughput.
          </p>
        </div>

        <Button
          onClick={fetchAdminStats}
          variant="outline"
          className="bg-stone-900 border-stone-800 hover:bg-stone-800 text-stone-200 font-mono text-xs font-bold px-4 py-5 rounded-xl self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
          Refresh Global Telemetry
        </Button>
      </div>

      {/* OPERATOR HERO STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-stone-900/80 border-2 border-cyan-500/30 p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold text-cyan-300">Registered Users</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-sans">
            {platformTotals.totalUsers.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-stone-400 font-mono">
            SaaS customer accounts
          </div>
        </Card>

        <Card className="bg-stone-900/70 border-stone-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Storage Proxied</span>
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-sans">
            {formatBytes(platformTotals.totalStorageProxiedBytes)}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono">
            Across {platformTotals.totalBuckets} total active buckets
          </div>
        </Card>

        <Card className="bg-stone-900/70 border-stone-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Platform Bandwidth</span>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-sans">
            {formatBytes(platformTotals.totalBandwidthTransferredBytes)}
          </div>
          <div className="mt-2 text-[11px] text-stone-400 font-mono">
            Total historical byte throughput
          </div>
        </Card>

        <Card className="bg-stone-900/90 border-2 border-emerald-500/30 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Today&apos;s Request Vol</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-sans">
            {platformTotals.totalRequestsToday.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-emerald-300 font-mono">
            Translation operations logged today
          </div>
        </Card>
      </div>

      {/* GLOBAL USER CONSUMPTION AUDIT TABLE */}
      <Card className="bg-stone-900/60 border-stone-800 overflow-hidden shadow-sm">
        <CardHeader className="p-6 bg-stone-900/80 border-b border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="font-extrabold text-white text-base">Registered Account Telemetry</CardTitle>
            <CardDescription className="text-xs text-stone-400 font-mono mt-0.5">Individual quota consumption, storage footprints, and traffic volume</CardDescription>
          </div>
          <Badge variant="secondary" className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
            {userBreakdowns.length} Account Profiles
          </Badge>
        </CardHeader>
        <Table>
          <TableHeader className="bg-stone-950/80">
            <TableRow className="border-stone-800 hover:bg-transparent">
              <TableHead className="py-4 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Customer Email & ID</TableHead>
              <TableHead className="py-4 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Subscription Tier</TableHead>
              <TableHead className="py-4 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Buckets / Objects</TableHead>
              <TableHead className="py-4 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Proxied Footprint</TableHead>
              <TableHead className="py-4 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Bandwidth Volume</TableHead>
              <TableHead className="py-4 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold text-right">API Requests</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-stone-800 text-sm">
            {userBreakdowns.map((u) => (
              <TableRow key={u.id} className="hover:bg-stone-800/50 transition-colors border-stone-800">
                <TableCell className="py-4 px-6">
                  <div className="font-extrabold text-white text-sm md:text-base">{u.email}</div>
                  <div className="text-[11px] text-stone-500 font-mono mt-0.5">ID: {u.id}</div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Badge variant="outline" className={`text-xs font-mono font-bold uppercase ${
                    u.plan === "pro"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      : "bg-stone-800 text-stone-300 border-stone-700"
                  }`}>
                    {u.plan.toUpperCase()} TIER
                  </Badge>
                </TableCell>
                <TableCell className="py-4 px-6 font-mono text-stone-300">
                  <span className="font-bold text-white">{u.bucketCount}</span> <span className="text-stone-500 text-xs">buckets</span> /{" "}
                  <span className="font-bold text-white">{u.objectCount}</span> <span className="text-stone-500 text-xs">files</span>
                </TableCell>
                <TableCell className="py-4 px-6 font-mono font-bold text-emerald-400">
                  {formatBytes(u.storageBytes)}
                </TableCell>
                <TableCell className="py-4 px-6 font-mono text-cyan-300">
                  {formatBytes(u.bandwidthBytes)}
                </TableCell>
                <TableCell className="py-4 px-6 text-right font-mono font-extrabold text-white">
                  {u.requestCount.toLocaleString()}{" "}
                  <span className="text-[11px] text-stone-500 font-normal">reqs</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
