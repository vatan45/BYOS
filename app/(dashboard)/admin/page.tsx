"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  HardDrive,
  Activity,
  Lock,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function AdminPage() {
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
        setError("Access denied.");
      }
    } catch {
      setError("Network error while retrieving telemetry.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto pb-16">
        <div className="flex justify-between pb-6 border-b border-stone-800/80">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 bg-stone-900" />
            <Skeleton className="h-4 w-72 bg-stone-900" />
          </div>
          <Skeleton className="h-9 w-32 bg-stone-900 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full bg-stone-900 rounded-xl" />
          <Skeleton className="h-32 w-full bg-stone-900 rounded-xl" />
          <Skeleton className="h-32 w-full bg-stone-900 rounded-xl" />
          <Skeleton className="h-32 w-full bg-stone-900 rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full bg-stone-900 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 rounded-xl bg-stone-900/40 border border-stone-800 text-center space-y-4">
        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-semibold text-white">Access restricted</h2>
        <p className="text-stone-400 text-xs">You do not have permission to access this page.</p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="outline" className="text-xs rounded-lg border-stone-800 hover:bg-stone-800 text-stone-300">
              Return to overview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { platformTotals, userBreakdowns } = data;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Platform Telemetry</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Aggregate statistics across user workspaces and byte throughput.
          </p>
        </div>

        <Button
          onClick={fetchAdminStats}
          variant="outline"
          className="border-stone-800 hover:bg-stone-800 text-stone-300 text-xs rounded-lg px-3 py-1.5 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
          Refresh
        </Button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-stone-900/50 border-stone-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase">Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {platformTotals.totalUsers.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-stone-400">
            Total accounts
          </div>
        </Card>

        <Card className="bg-stone-900/50 border-stone-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase">Total Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {formatBytes(platformTotals.totalStorageProxiedBytes)}
          </div>
          <div className="mt-2 text-xs text-stone-400">
            Across {platformTotals.totalBuckets} buckets
          </div>
        </Card>

        <Card className="bg-stone-900/50 border-stone-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase">Bandwidth</span>
            <TrendingUp className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {formatBytes(platformTotals.totalBandwidthTransferredBytes)}
          </div>
          <div className="mt-2 text-xs text-stone-400">
            Historical throughput
          </div>
        </Card>

        <Card className="bg-stone-900/50 border-stone-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase">Today&apos;s Requests</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {platformTotals.totalRequestsToday.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-stone-400">
            Operations logged today
          </div>
        </Card>
      </div>

      {/* USER AUDIT TABLE */}
      <Card className="bg-stone-900/40 border-stone-800/80 rounded-xl overflow-hidden">
        <CardHeader className="p-5 bg-stone-900/60 border-b border-stone-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="font-medium text-white text-sm">Account Telemetry</CardTitle>
            <CardDescription className="text-xs text-stone-400 mt-0.5">Quota consumption and activity by user</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono bg-stone-800 text-stone-300 border-stone-700">
            {userBreakdowns.length} Accounts
          </Badge>
        </CardHeader>
        <Table>
          <TableHeader className="bg-[#0c0e0d]">
            <TableRow className="border-stone-800/80 hover:bg-transparent">
              <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Email</TableHead>
              <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Plan</TableHead>
              <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Buckets / Objects</TableHead>
              <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Storage</TableHead>
              <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Bandwidth</TableHead>
              <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium text-right">Requests</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-stone-800/60 text-xs">
            {userBreakdowns.map((u) => (
              <TableRow key={u.id} className="hover:bg-stone-900/40 transition-colors border-stone-800/60">
                <TableCell className="py-3 px-5">
                  <div className="font-medium text-white">{u.email}</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">{u.id}</div>
                </TableCell>
                <TableCell className="py-3 px-5">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-stone-800 text-stone-300 border-stone-700">
                    {u.plan}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 px-5 font-mono text-stone-300">
                  {u.bucketCount} buckets / {u.objectCount} files
                </TableCell>
                <TableCell className="py-3 px-5 font-mono text-emerald-400">
                  {formatBytes(u.storageBytes)}
                </TableCell>
                <TableCell className="py-3 px-5 font-mono text-stone-300">
                  {formatBytes(u.bandwidthBytes)}
                </TableCell>
                <TableCell className="py-3 px-5 text-right font-mono font-medium text-white">
                  {u.requestCount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
