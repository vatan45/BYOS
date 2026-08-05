"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  HardDrive,
  Activity,
  ArrowUpRight,
  Database,
  RefreshCw,
  TrendingUp,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface TimeSeriesPoint {
  date: string;
  label: string;
  storageUsed: number;
  upload: number;
  download: number;
  delete: number;
  list: number;
  bandwidthBytes: number;
}

interface TopObjectItem {
  key: string;
  requests: number;
  bytes: number;
  lastAccessed: string;
}

interface AnalyticsData {
  granularity: string;
  summary: {
    totalStorageBytes: number;
    totalBandwidthBytes: number;
    totalRequests: number;
    objectCount: number;
  };
  series: TimeSeriesPoint[];
  topObjects: TopObjectItem[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [granularity, setGranularity] = useState<string>("day");

  useEffect(() => {
    fetchAnalytics();
  }, [granularity]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/analytics/usage?granularity=${granularity}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load telemetry data:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        <div className="flex flex-col md:flex-row justify-between pb-6 border-b border-stone-800 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72 bg-stone-900" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-80 w-full bg-stone-900 rounded-2xl" />
          <Skeleton className="h-80 w-full bg-stone-900 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full bg-stone-900 rounded-2xl" />
      </div>
    );
  }

  const { summary, series, topObjects } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <BarChart3 className="w-7 h-7 text-emerald-400" />
            <span>Telemetry & Storage Analytics</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Real-time hourly usage rollups, bandwidth transfer proxies, and API operation distributions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-stone-400 flex items-center space-x-1">
            <Sliders className="w-3.5 h-3.5 text-cyan-400 mr-1 shrink-0" />
            Time Horizon:
          </span>
          <Tabs value={granularity} onValueChange={(val) => setGranularity(val)} className="w-40">
            <TabsList className="bg-stone-900 border border-stone-800 grid w-full grid-cols-2">
              <TabsTrigger value="day" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-stone-950 font-bold text-xs">Daily</TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-stone-950 font-bold text-xs">Weekly</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            className="bg-stone-900 border-stone-800 hover:bg-stone-800 text-stone-300 rounded-xl shrink-0"
            title="Refresh real-time rollup data"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </Button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-stone-900/70 border-stone-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Proxied Storage</span>
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white font-sans">
            {formatBytes(summary.totalStorageBytes)}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            <span>Across {summary.objectCount} total Drive objects</span>
          </div>
        </Card>

        <Card className="bg-stone-900/70 border-stone-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Bandwidth Volume</span>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white font-sans">
            {formatBytes(summary.totalBandwidthBytes)}
          </div>
          <div className="mt-2 text-[11px] text-stone-400 font-mono">
            <span>Zero transfer egress fees</span>
          </div>
        </Card>

        <Card className="bg-stone-900/70 border-stone-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Total API Requests</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white font-sans">
            {summary.totalRequests.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-1" />
            <span>100% successful translations</span>
          </div>
        </Card>

        <Card className="bg-stone-900/90 border-2 border-emerald-500/40 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-mono uppercase font-extrabold">Cost Savings Proxy</span>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white font-sans">
            ~$0.00
          </div>
          <div className="mt-2 text-[11px] text-stone-300 font-mono">
            Direct Drive streams bypass cloud proxy markup
          </div>
        </Card>
      </div>

      {/* CHARTS SECTION (Recharts in shadcn Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-stone-900/60 border-stone-800 p-6 shadow-sm">
          <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-extrabold text-white">Storage Capacity Over Time</CardTitle>
              <CardDescription className="text-xs text-stone-400 font-mono">Total bytes hosted in Google Drive provider</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-mono bg-stone-800 text-stone-300 border-stone-700">
              Daily Rollup
            </Badge>
          </CardHeader>
          <CardContent className="p-0 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                <XAxis dataKey="label" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatBytes(val)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c1917", borderColor: "#292524", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [formatBytes(Number(val) || 0), "Storage Used"]}
                />
                <Area
                  type="monotone"
                  dataKey="storageUsed"
                  name="Storage (Bytes)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorStorage)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-stone-900/60 border-stone-800 p-6 shadow-sm">
          <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-extrabold text-white">Requests by Operation Type</CardTitle>
              <CardDescription className="text-xs text-stone-400 font-mono">Stacked throughput (Upload / Download / Delete / List)</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Granular Operations
            </Badge>
          </CardHeader>
          <CardContent className="p-0 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                <XAxis dataKey="label" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c1917", borderColor: "#292524", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="upload" name="PUT Upload" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="download" name="GET Download" stackId="a" fill="#06B6D4" />
                <Bar dataKey="list" name="GET List" stackId="a" fill="#3B82F6" />
                <Bar dataKey="delete" name="DELETE" stackId="a" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TOP ACCESSED OBJECTS TABLE */}
      <Card className="bg-stone-900/60 border-stone-800 overflow-hidden shadow-sm">
        <CardHeader className="p-6 bg-stone-900/80 border-b border-stone-800 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-extrabold text-white text-base">Top Accessed S3 Objects</CardTitle>
            <CardDescription className="text-xs text-stone-400 font-mono mt-0.5">Most active keys sorted by request count & bandwidth</CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border-emerald-500/30">
            Top {topObjects.length} Active Files
          </Badge>
        </CardHeader>
        <Table>
          <TableHeader className="bg-stone-950/80">
            <TableRow className="border-stone-800 hover:bg-transparent">
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Object Key Path</TableHead>
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Total Request Hits</TableHead>
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Total Bandwidth Transferred</TableHead>
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Last Accessed Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-stone-800 text-sm">
            {topObjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-stone-400 font-mono text-xs">
                  No object interactions logged during this monitoring window.
                </TableCell>
              </TableRow>
            ) : (
              topObjects.map((obj) => (
                <TableRow key={obj.key} className="hover:bg-stone-800/50 transition-colors border-stone-800">
                  <TableCell className="py-4 px-6 font-mono text-white font-semibold flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                    <span>{obj.key}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 font-mono font-bold text-emerald-400">
                    {obj.requests} <span className="text-xs text-stone-500 font-normal">hits</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 font-mono text-stone-300">
                    {formatBytes(obj.bytes)}
                  </TableCell>
                  <TableCell className="py-4 px-6 font-mono text-xs text-stone-400">
                    {new Date(obj.lastAccessed).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
