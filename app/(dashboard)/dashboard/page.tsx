"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Folder,
  Copy,
  Check,
  Plus,
  ArrowUpRight,
  Database,
  HardDrive,
  KeyRound,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface BucketSummary {
  id: string;
  name: string;
  providerFolderId: string;
  objectCount: number;
  sizeBytes: number;
  createdAt: string;
}

interface OverviewData {
  user: { id: string; email: string; plan: string };
  connection: {
    connected: boolean;
    email: string | null;
    status: string;
    expiresAt: string | null;
  };
  buckets: BucketSummary[];
  usage: {
    usedBytes: number;
    limitBytes: number;
    percentage: number;
    activeKeysCount: number;
    maxKeys: string | number;
  };
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function MainDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  // New bucket creation modal state
  const [newBucketName, setNewBucketName] = useState("");
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [bucketError, setBucketError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch {
      // Gracefully handle network error
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccessId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopySuccessId(null), 2000);
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    setCreatingBucket(true);
    setBucketError(null);
    try {
      const res = await fetch("/api/v1/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBucketName.trim().toLowerCase() }),
      });
      if (res.ok) {
        setNewBucketName("");
        setShowCreateModal(false);
        toast.success("Bucket created successfully");
        fetchOverview();
      } else {
        const err = await res.json().catch(() => ({}));
        setBucketError(err?.error?.message || "Failed to create bucket");
      }
    } catch {
      setBucketError("Network error. Please try again.");
    } finally {
      setCreatingBucket(false);
    }
  };

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/buckets`
      : "/api/v1/buckets";

  if (!loading && !overview) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-stone-800 bg-stone-900/60 p-8 space-y-4 max-w-xl mx-auto text-center"
      >
        <h1 className="text-xl font-medium text-white">Unable to load workspace</h1>
        <p className="text-sm text-stone-400">
          Please check your connection and sign in again.
        </p>
        <div className="pt-2">
          <Button
            onClick={() => fetchOverview()}
            className="rounded-lg bg-emerald-400 text-stone-950 font-medium px-4 py-2 hover:bg-emerald-300"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between pb-6 border-b border-stone-800/80 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 bg-stone-900" />
            <Skeleton className="h-4 w-72 bg-stone-900" />
          </div>
          <Skeleton className="h-9 w-32 bg-stone-900 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-36 w-full bg-stone-900 rounded-xl" />
          <Skeleton className="h-36 w-full bg-stone-900 rounded-xl" />
          <Skeleton className="h-36 w-full bg-stone-900 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full bg-stone-900 rounded-xl" />
      </div>
    );
  }

  const isConnected = overview?.connection?.connected;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* HEADER PAGE TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Overview
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Your storage workspace at a glance.
          </p>
        </div>
        {isConnected && (
          <Button
            onClick={() => {
              setBucketError(null);
              setShowCreateModal(true);
            }}
            className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            New bucket
          </Button>
        )}
      </div>

      {/* STATE 1: UNCONNECTED DRIVE HERO */}
      {!isConnected && (
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 md:p-10 bg-stone-900/50 border border-stone-800 rounded-2xl text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Storage setup</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Connect your Google Drive
              </h2>
              <p className="text-stone-400 text-sm max-w-lg mx-auto leading-relaxed">
                Link your Google account to create buckets, manage objects, and serve files through the developer API.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/api/auth/google/connect">
                <Button className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium rounded-lg px-6 py-2.5 text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Connect Google Drive
                </Button>
              </a>
              <Link href="/docs">
                <Button
                  variant="outline"
                  className="border-stone-700 bg-transparent hover:bg-stone-800 text-stone-300 rounded-lg px-5 py-2.5 text-sm"
                >
                  Documentation
                </Button>
              </Link>
            </div>

            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left border-t border-stone-800/80 text-xs text-stone-400">
              <div className="space-y-1">
                <p className="font-medium text-stone-200">Isolated workspace</p>
                <p className="text-stone-400">BYOS only accesses files created inside its own root folder.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-stone-200">Zero egress fees</p>
                <p className="text-stone-400">Stream and download files directly without cloud bandwidth charges.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-stone-200">Your control</p>
                <p className="text-stone-400">Pause or disconnect storage at any time from your settings.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STATE 2: CONNECTED STORAGE METERS */}
      {isConnected && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Connection Status Card */}
            <Card className="bg-stone-900/50 border-stone-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-stone-400">
                    Storage provider
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-stone-800/80 text-stone-300 border-stone-700 text-[10px] font-mono"
                  >
                    Google Drive
                  </Badge>
                </div>
                <div className="text-sm font-medium text-white truncate font-mono pt-1">
                  {overview?.connection.email}
                </div>
              </div>
              <div className="pt-4 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-400">
                <span className="font-mono text-[11px] text-emerald-400">Connected</span>
                <Link
                  href="/settings"
                  className="text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1"
                >
                  Settings <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>

            {/* Storage Quota Progress Card */}
            <Card className="bg-stone-900/50 border-stone-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-stone-400">
                    Storage used
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase font-mono bg-stone-800 text-stone-300"
                  >
                    {overview?.user.plan}
                  </Badge>
                </div>
                <div className="flex justify-between items-baseline text-sm pt-1">
                  <span className="text-white font-mono font-semibold text-lg">
                    {formatBytes(overview?.usage.usedBytes || 0)}
                  </span>
                  <span className="text-stone-400 font-mono text-xs">
                    of {formatBytes(overview?.usage.limitBytes || 15 * 1024 * 1024 * 1024)} ({overview?.usage.percentage}%)
                  </span>
                </div>
                <Progress
                  value={Math.max(2, overview?.usage.percentage || 0)}
                  className="h-1.5 bg-stone-800"
                />
              </div>
              <div className="pt-4 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-400">
                <span className="font-mono text-[11px]">{overview?.buckets.length} active bucket{overview?.buckets.length === 1 ? "" : "s"}</span>
                <Link
                  href="/objects"
                  className="text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1"
                >
                  Browse <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>

            {/* API Keys Summary Card */}
            <Card className="bg-stone-900/50 border-stone-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-stone-400">
                    API keys
                  </span>
                  <KeyRound className="w-4 h-4 text-stone-500" />
                </div>
                <div className="text-lg font-semibold font-mono text-white pt-1">
                  {overview?.usage.activeKeysCount}{" "}
                  <span className="text-xs font-normal text-stone-400">
                    active
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-400">
                <span className="font-mono text-[11px]">byos-sdk</span>
                <Link
                  href="/keys"
                  className="text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1"
                >
                  Manage keys <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </div>

          {/* BUCKETS SECTION */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Buckets</span>
                <span className="text-xs text-stone-500 font-mono">({overview?.buckets.length})</span>
              </h2>
            </div>

            {overview?.buckets.length === 0 ? (
              <EmptyState
                title="No buckets yet"
                description="Create a bucket to begin organizing files in your connected Google Drive."
                icon={<Folder className="w-7 h-7 text-stone-500" />}
                badgeText="Ready"
                action={
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2 rounded-lg text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create bucket
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview?.buckets.map((b) => {
                  const bucketEndpoint = `${baseUrl}/${b.name}/objects`;
                  return (
                    <Card
                      key={b.id}
                      className="bg-stone-900/50 border-stone-800/80 rounded-xl p-5 hover:border-stone-700 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-lg bg-stone-800 border border-stone-700/80 flex items-center justify-center text-stone-300">
                              <Folder className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <Link
                                href={`/objects?bucket=${b.name}`}
                                className="font-medium text-white text-base hover:text-emerald-400 transition-colors"
                              >
                                {b.name}
                              </Link>
                              <div className="text-[11px] text-stone-500 font-mono">
                                {new Date(b.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Link href={`/objects?bucket=${b.name}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-stone-800 hover:bg-stone-800 text-stone-300 text-xs rounded-lg"
                            >
                              Explore
                            </Button>
                          </Link>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 bg-[#0c0e0d] p-3 rounded-lg border border-stone-800/60 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-stone-500 block">Objects</span>
                            <span className="font-mono font-medium text-white">{b.objectCount}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-stone-500 block">Size</span>
                            <span className="font-mono font-medium text-emerald-400">{formatBytes(b.sizeBytes)}</span>
                          </div>
                        </div>

                        {/* Copy Endpoint */}
                        <div className="space-y-1.5 pt-1 text-xs">
                          <span className="text-[10px] font-mono uppercase text-stone-500">API Endpoint</span>
                          <div className="flex items-center justify-between bg-[#0c0e0d] px-2.5 py-1.5 rounded-lg border border-stone-800/60 font-mono text-stone-300 text-[11px] truncate">
                            <span className="truncate flex-1">{bucketEndpoint}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(bucketEndpoint, `url-${b.id}`)}
                              className="h-5 w-5 text-stone-500 hover:text-white shrink-0 ml-2"
                            >
                              {copySuccessId === `url-${b.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE BUCKET DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#0c0e0d] border-stone-800 text-stone-100 sm:max-w-md rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              New bucket
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              A corresponding folder will be created in your Google Drive.
            </DialogDescription>
          </DialogHeader>

          {bucketError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {bucketError}
            </div>
          )}

          <form onSubmit={handleCreateBucket} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-300">
                Bucket name
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. app-assets"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                className="bg-stone-900 border-stone-800 text-white font-mono text-sm focus-visible:ring-emerald-400 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingBucket}
                className="rounded-lg text-stone-400 hover:text-stone-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingBucket || !newBucketName.trim()}
                className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium rounded-lg px-4 text-xs"
              >
                {creatingBucket ? "Creating…" : "Create bucket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
