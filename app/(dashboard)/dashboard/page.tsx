"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  HardDrive,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Database,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Layers,
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
import { GlareCard } from "@/components/ui/glare-card";
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

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
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
    } catch (e) {
      console.error("Failed to load dashboard overview:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccessId(id);
    toast.success("Copied to clipboard!");
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
        toast.success(
          "Storage bucket provisioned successfully in Google Drive!"
        );
        fetchOverview();
      } else {
        const err = await res.json();
        setBucketError(
          err?.error?.message || "Failed to create bucket in Google Drive."
        );
      }
    } catch {
      setBucketError(
        "Network error occurred while communicating with storage engine."
      );
    } finally {
      setCreatingBucket(false);
    }
  };

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/buckets`
      : "http://localhost:3000/api/v1/buckets";

  if (!loading && !overview) {
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
          onClick={() => fetchOverview()}
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

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between pb-6 border-b border-stone-800 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-stone-900" />
            <Skeleton className="h-4 w-96 bg-stone-900" />
          </div>
          <Skeleton className="h-10 w-48 bg-stone-900 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-44 w-full bg-stone-900 rounded-2xl" />
          <Skeleton className="h-44 w-full bg-stone-900 rounded-2xl" />
          <Skeleton className="h-44 w-full bg-stone-900 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full bg-stone-900 rounded-3xl" />
      </div>
    );
  }

  const isConnected = overview?.connection?.connected;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER PAGE TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Server className="w-7 h-7 text-emerald-400" />
            <span>Storage Platform Overview</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1 font-sans">
            Manage your Google Drive cloud connection, active storage quotas,
            and S3 API endpoints.
          </p>
        </div>
        {isConnected && (
          <Button
            onClick={() => {
              setBucketError(null);
              setShowCreateModal(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-xl px-5 py-2.5"
          >
            <Plus className="w-4 h-4 mr-2 stroke-[3]" />
            Provision Storage Bucket
          </Button>
        )}
      </div>

      {/* STATE 1: UNCONNECTED DRIVE HERO (Aceternity Glare Card) */}
      {!isConnected && (
        <div className="max-w-4xl mx-auto">
          <GlareCard className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Action Required: Connect Object Storage Backend</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white max-w-2xl">
              Transform your Google Drive into High-Speed S3 Object Storage
            </h2>

            <p className="text-stone-300 text-base max-w-3xl font-sans leading-relaxed">
              Connect your account to automatically provision an isolated{" "}
              <strong className="text-emerald-400">BYOS root folder</strong>{" "}
              inside Google Drive. Our OAuth integration enforces strict
              zero-trust security: we request read/write privileges{" "}
              <strong className="text-white">only</strong> for files created by
              BYOS (
              <code className="text-xs font-mono bg-stone-900 px-1.5 py-0.5 rounded text-emerald-300">
                drive.file
              </code>{" "}
              scope). You can safely pause or revoke access at any time without
              deleting existing cloud files.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <a href="/api/auth/google/connect" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-base shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  <HardDrive className="w-5 h-5 mr-2" />
                  Connect Google Drive Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <Link href="/settings" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-6 py-6 rounded-2xl border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 font-bold"
                >
                  Review Security Protocols
                </Button>
              </Link>
            </div>

            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left border-t border-stone-800 w-full text-xs text-stone-400">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200">
                    Isolated Folder Only:
                  </strong>{" "}
                  Cannot view or edit existing personal spreadsheets, docs, or
                  photos in your Google Drive.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200">Zero Egress Fees:</strong>{" "}
                  Stream gigabytes of video or static objects directly without
                  AWS bandwidth charges.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200">
                    Instant Revocation:
                  </strong>{" "}
                  Disconnect any time with 1-click in console or Google account
                  controls.
                </div>
              </div>
            </div>
          </GlareCard>
        </div>
      )}

      {/* STATE 2: CONNECTED STORAGE METERS & STATISTICS */}
      {isConnected && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Connection Health Card */}
            <Card className="bg-stone-900/60 border-stone-800 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <CardDescription className="font-mono text-xs font-bold uppercase text-stone-400">
                    Storage Provider
                  </CardDescription>
                  <Badge
                    variant="outline"
                    className="bg-stone-800 text-stone-300 border-stone-700 font-mono text-[10px]"
                  >
                    Google Drive
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-white truncate font-mono">
                  {overview?.connection.email}
                </CardTitle>
              </CardHeader>
              <CardFooter className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 font-mono">
                <span>
                  Scope:{" "}
                  <code className="text-emerald-400 font-bold">drive.file</code>
                </span>
                <Link
                  href="/settings"
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2"
                >
                  Manage &rarr;
                </Link>
              </CardFooter>
            </Card>

            {/* Storage Quota Progress Bar Card (shadcn Progress) */}
            <Card className="bg-stone-900/60 border-stone-800 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <CardDescription className="font-mono text-xs font-bold uppercase text-stone-400">
                    Drive Quota Consumption
                  </CardDescription>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                  >
                    {overview?.user.plan.toUpperCase()} TIER
                  </Badge>
                </div>
                <div className="flex justify-between items-baseline text-sm my-1">
                  <span className="text-white font-mono font-extrabold text-lg">
                    {formatBytes(overview?.usage.usedBytes || 0)}
                  </span>
                  <span className="text-stone-400 font-mono text-xs">
                    of{" "}
                    {formatBytes(
                      overview?.usage.limitBytes || 5 * 1024 * 1024 * 1024
                    )}{" "}
                    ({overview?.usage.percentage}%)
                  </span>
                </div>
                <Progress
                  value={Math.max(2, overview?.usage.percentage || 0)}
                  className="h-2.5 bg-stone-800"
                />
              </CardHeader>
              <CardFooter className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 font-mono">
                <span>
                  Allowance:{" "}
                  <strong className="text-stone-200">
                    {overview?.user.plan === "pro"
                      ? "Unlimited Buckets"
                      : "1 Bucket"}
                  </strong>
                </span>
                <Link
                  href="/objects"
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  Browse &rarr;
                </Link>
              </CardFooter>
            </Card>

            {/* API Keys Summary Card */}
            <Card className="bg-stone-900/60 border-stone-800 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <CardDescription className="font-mono text-xs font-bold uppercase text-stone-400">
                    API Access Security
                  </CardDescription>
                  <Badge
                    variant="outline"
                    className="bg-purple-500/10 text-purple-300 border-purple-500/30 font-mono text-[10px] font-bold"
                  >
                    Bcrypt Hash
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 my-2">
                  <div className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold font-mono text-white">
                      {overview?.usage.activeKeysCount}{" "}
                      <span className="text-xs font-normal text-stone-400">
                        Active Keys
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Max authorized quota:{" "}
                      <span className="text-stone-200 font-mono font-bold">
                        {overview?.usage.maxKeys}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 font-mono">
                <span>
                  SDK:{" "}
                  <code className="text-stone-300 font-bold">byos-sdk</code>
                </span>
                <Link
                  href="/keys"
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2"
                >
                  Manage Keys &rarr;
                </Link>
              </CardFooter>
            </Card>
          </div>

          {/* BUCKETS GRID */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>
                  Connected Storage Buckets ({overview?.buckets.length})
                </span>
              </h2>
              <span className="text-xs text-stone-400 font-mono hidden md:inline">
                Each bucket maps to a root folder in your Drive
              </span>
            </div>

            {overview?.buckets.length === 0 ? (
              <EmptyState
                title="No active storage buckets provisioned yet"
                description="Click below to instantiate your initial bucket. A designated folder will be created immediately within your Google Drive."
                icon={<Layers className="w-8 h-8 text-stone-500" />}
                badgeText="Ready for creation"
                action={
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold px-6 py-5 rounded-xl text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Bucket
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {overview?.buckets.map((b) => {
                  const bucketEndpoint = `${baseUrl}/${b.name}/objects`;
                  return (
                    <Card
                      key={b.id}
                      className="bg-stone-900/70 border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between shadow-md"
                    >
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center font-mono text-emerald-400 text-base">
                              🗂️
                            </div>
                            <div>
                              <Link
                                href={`/objects?bucket=${b.name}`}
                                className="font-extrabold text-white text-lg hover:text-emerald-400 transition-colors"
                              >
                                {b.name}
                              </Link>
                              <div className="text-[11px] text-stone-400 font-mono">
                                Created{" "}
                                {new Date(b.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Link href={`/objects?bucket=${b.name}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-stone-900 border-stone-700 hover:bg-stone-800 text-stone-200 font-bold text-xs"
                            >
                              Explore ({b.objectCount})
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>

                        {/* Stats mini grid */}
                        <div className="grid grid-cols-2 gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                          <div>
                            <div className="text-[10px] uppercase font-mono font-semibold text-stone-400">
                              Total Objects
                            </div>
                            <div className="text-sm font-bold font-mono text-white">
                              {b.objectCount} Files
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-mono font-semibold text-stone-400">
                              Storage Size
                            </div>
                            <div className="text-sm font-bold font-mono text-emerald-400">
                              {formatBytes(b.sizeBytes)}
                            </div>
                          </div>
                        </div>

                        {/* Quick Copy Snippets */}
                        <div className="space-y-3 pt-2 border-t border-stone-800/80 text-xs">
                          <div>
                            <div className="text-[10px] font-mono font-semibold uppercase text-stone-400 mb-1">
                              Bucket Identifier & Drive Folder ID
                            </div>
                            <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-mono text-cyan-300 text-[11px] truncate">
                              <span className="truncate flex-1">
                                {b.providerFolderId}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleCopy(b.providerFolderId, `id-${b.id}`)
                                }
                                className="h-6 w-6 text-stone-400 hover:text-white shrink-0 ml-2"
                              >
                                {copySuccessId === `id-${b.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-mono font-semibold uppercase text-stone-400 mb-1">
                              REST API Base URL Endpoint
                            </div>
                            <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-mono text-emerald-300 text-[11px] truncate">
                              <span className="truncate flex-1">
                                {bucketEndpoint}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleCopy(bucketEndpoint, `url-${b.id}`)
                                }
                                className="h-6 w-6 text-stone-400 hover:text-white shrink-0 ml-2"
                              >
                                {copySuccessId === `url-${b.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE BUCKET SHADCN DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-white">
                  Provision New Bucket
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-400">
                  Creates a matching folder directly in Google Drive
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {bucketError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <span>⚠️ {bucketError}</span>
            </div>
          )}

          <form onSubmit={handleCreateBucket} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Bucket Name (lowercase alphanumeric & hyphens)
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g., prod-media-uploads"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                className="bg-stone-900 border-stone-800 text-white font-mono text-sm focus-visible:ring-emerald-500 rounded-xl"
              />
            </div>

            <div className="text-[11px] text-stone-400 bg-stone-900/60 p-3 rounded-xl border border-stone-800 leading-relaxed">
              💡{" "}
              <strong className="text-stone-300">Storage Architecture:</strong>{" "}
              Buckets map directly to isolated subdirectories inside your
              connected Google Drive workspace without intermediary staging
              servers.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingBucket}
                className="rounded-xl text-stone-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingBucket || !newBucketName.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold rounded-xl px-5 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {creatingBucket ? "Provisioning..." : "Create Bucket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
