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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
      const res = await fetch(
        `/api/v1/analytics/usage?granularity=${granularity}`
      );
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

  if (!loading && !data) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-stone-800 bg-stone-900 p-8 space-y-4"
      >
        <h1 className="text-xl">Unable to load this workspace</h1>
        <p className="text-stone-400">
          Check your connection and sign-in session, then try again.
        </p>
        <button
          onClick={() => fetchAnalytics()}
          className="rounded-md bg-emerald-400 text-stone-950 px-4 py-2"
        >
          Try again
        </button>
        <a href="/login" className="ml-4 underline">
          Sign in
        </a>
      </div>
    );
  }

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
    <div className="space-y-8">
      {/* HEADING */}
      <div className="preview-heading">
        <div>
          <span className="muted">METRICS & THROUGHPUT</span>
          <h3>Analytics</h3>
        </div>

        <div className="flex items-center gap-3">
          <Tabs
            value={granularity}
            onValueChange={(val) => setGranularity(val)}
            className="w-36"
          >
            <TabsList className="bg-[#111411] border border-[#292d29] grid w-full grid-cols-2">
              <TabsTrigger
                value="day"
                className="data-[state=active]:bg-[#d8f99c] data-[state=active]:text-[#111411] text-xs"
              >
                Daily
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="data-[state=active]:bg-[#d8f99c] data-[state=active]:text-[#111411] text-xs"
              >
                Weekly
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            onClick={fetchAnalytics}
            className="p-2 border border-[#292d29] rounded bg-[#111411] hover:bg-[#1a2018] text-[#929a8d] hover:text-[#f0f2eb] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="preview-stats">
        <div>
          <span>Storage used</span>
          <strong>
            {formatBytes(summary.totalStorageBytes)}
          </strong>
          <small>Across {summary.objectCount} objects</small>
        </div>
        <div>
          <span>Bandwidth</span>
          <strong>
            {formatBytes(summary.totalBandwidthBytes)}
          </strong>
          <small>Zero egress fees</small>
        </div>
        <div>
          <span>API requests</span>
          <strong>{summary.totalRequests.toLocaleString()}</strong>
          <small>Total operations</small>
        </div>
      </div>

      {/* CHARTS SECTION (Recharts in shadcn Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-stone-900/60 border-stone-800 p-6 shadow-sm">
          <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-extrabold text-white">
                Storage Capacity Over Time
              </CardTitle>
              <CardDescription className="text-xs text-stone-400 font-mono">
                Total bytes hosted in Google Drive provider
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono bg-stone-800 text-stone-300 border-stone-700"
            >
              Daily Rollup
            </Badge>
          </CardHeader>
          <CardContent className="p-0 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                <XAxis
                  dataKey="label"
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatBytes(val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1c1917",
                    borderColor: "#292524",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [
                    formatBytes(Number(val) || 0),
                    "Storage Used",
                  ]}
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
              <CardTitle className="text-base font-extrabold text-white">
                Requests by Operation Type
              </CardTitle>
              <CardDescription className="text-xs text-stone-400 font-mono">
                Stacked throughput (Upload / Download / Delete / List)
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] uppercase font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
            >
              Granular Operations
            </Badge>
          </CardHeader>
          <CardContent className="p-0 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                <XAxis
                  dataKey="label"
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1c1917",
                    borderColor: "#292524",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="upload"
                  name="PUT Upload"
                  stackId="a"
                  fill="#10B981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="download"
                  name="GET Download"
                  stackId="a"
                  fill="#06B6D4"
                />
                <Bar
                  dataKey="list"
                  name="GET List"
                  stackId="a"
                  fill="#3B82F6"
                />
                <Bar
                  dataKey="delete"
                  name="DELETE"
                  stackId="a"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TOP ACCESSED OBJECTS TABLE */}
      <Card className="bg-stone-900/60 border-stone-800 overflow-hidden shadow-sm">
        <CardHeader className="p-6 bg-stone-900/80 border-b border-stone-800 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-extrabold text-white text-base">
              Top Accessed S3 Objects
            </CardTitle>
            <CardDescription className="text-xs text-stone-400 font-mono mt-0.5">
              Most active keys sorted by request count & bandwidth
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border-emerald-500/30"
          >
            Top {topObjects.length} Active Files
          </Badge>
        </CardHeader>
        <Table>
          <TableHeader className="bg-stone-950/80">
            <TableRow className="border-stone-800 hover:bg-transparent">
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">
                Object Key Path
              </TableHead>
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">
                Total Request Hits
              </TableHead>
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">
                Total Bandwidth Transferred
              </TableHead>
              <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">
                Last Accessed Timestamp
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-stone-800 text-sm">
            {topObjects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-stone-400 font-mono text-xs"
                >
                  No object interactions logged during this monitoring window.
                </TableCell>
              </TableRow>
            ) : (
              topObjects.map((obj) => (
                <TableRow
                  key={obj.key}
                  className="hover:bg-stone-800/50 transition-colors border-stone-800"
                >
                  <TableCell className="py-4 px-6 font-mono text-white font-semibold flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                    <span>{obj.key}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 font-mono font-bold text-emerald-400">
                    {obj.requests}{" "}
                    <span className="text-xs text-stone-500 font-normal">
                      hits
                    </span>
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
