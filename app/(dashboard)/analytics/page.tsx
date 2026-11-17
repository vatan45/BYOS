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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold text-stone-100">Analytics</h1>
          <p className="mt-1 text-sm text-stone-400">Inspect storage growth, request counts, and data transfer rates.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-stone-900 border border-stone-700 rounded-lg p-1 text-xs">
            <button
              onClick={() => setGranularity("day")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                granularity === "day"
                  ? "bg-emerald-400 text-stone-950"
                  : "text-stone-400 hover:text-stone-100"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGranularity("week")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                granularity === "week"
                  ? "bg-emerald-400 text-stone-950"
                  : "text-stone-400 hover:text-stone-100"
              }`}
            >
              Weekly
            </button>
          </div>
          <button
            onClick={fetchAnalytics}
            className="p-2.5 border border-stone-800 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Storage used</div>
          <div className="text-2xl font-semibold text-stone-100 mt-2">
            {formatBytes(summary.totalStorageBytes)}
          </div>
          <div className="text-xs text-stone-400 mt-2">Across {summary.objectCount} objects</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Bandwidth</div>
          <div className="text-2xl font-semibold text-stone-100 mt-2">
            {formatBytes(summary.totalBandwidthBytes)}
          </div>
          <div className="text-xs text-stone-400 mt-2">Zero egress fees</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">API requests</div>
          <div className="text-2xl font-semibold text-stone-100 mt-2">{summary.totalRequests.toLocaleString()}</div>
          <div className="text-xs text-stone-400 mt-2">Total operations</div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
          <div className="mb-6 border-b border-stone-800/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                Storage Capacity Over Time
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Total bytes hosted in Google Drive provider
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400">
              Rollup
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
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
                    borderRadius: "8px",
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
                  stroke="#34d399"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorStorage)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
          <div className="mb-6 border-b border-stone-800/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                Requests by Operation Type
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Stacked throughput (Upload / Download / Delete / List)
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400">
              Operations
            </span>
          </div>
          <div className="h-72 w-full">
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
                    borderRadius: "8px",
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
                  fill="#34d399"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="download"
                  name="GET Download"
                  stackId="a"
                  fill="#60a5fa"
                />
                <Bar
                  dataKey="list"
                  name="GET List"
                  stackId="a"
                  fill="#a78bfa"
                />
                <Bar
                  dataKey="delete"
                  name="DELETE"
                  stackId="a"
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP ACCESSED OBJECTS TABLE */}
      <div className="border border-stone-800 rounded-lg overflow-hidden bg-stone-900/40">
        <div className="px-5 py-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-100">
              Top Accessed Objects
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Most active keys sorted by request count & bandwidth
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 font-medium">
            Top {topObjects.length} files
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900/80 text-xs font-medium text-stone-400 uppercase tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-5">Object Key</th>
                <th className="py-3 px-5">Requests</th>
                <th className="py-3 px-5">Bandwidth</th>
                <th className="py-3 px-5">Last Accessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-200">
              {topObjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-stone-400 text-sm">
                    No object interactions logged during this monitoring window.
                  </td>
                </tr>
              ) : (
                topObjects.map((obj) => (
                  <tr key={obj.key} className="hover:bg-stone-800/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-stone-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{obj.key}</span>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-medium text-emerald-400">
                      {obj.requests} <span className="text-xs text-stone-500 font-normal">hits</span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-stone-300">
                      {formatBytes(obj.bytes)}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-stone-400">
                      {new Date(obj.lastAccessed).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
