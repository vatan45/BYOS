"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Folder,
  ArrowUpRight,
  HardDrive,
  Plus,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function formatBytesComponents(bytes: number) {
  if (!+bytes) return { value: "0", unit: "B" };
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return {
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toString(),
    unit: sizes[i],
  };
}

function formatBytes(bytes: number) {
  const { value, unit } = formatBytesComponents(bytes);
  return `${value} ${unit}`;
}

export default function MainDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  // New bucket modal state
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
      // Handled gracefully
    } finally {
      setLoading(false);
    }
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
        toast.success("Bucket created");
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

  if (!loading && !overview) {
    return (
      <div className="p-8 border border-stone-800 rounded-lg bg-stone-900 text-center max-w-md mx-auto my-12">
        <h3 className="text-lg font-medium text-stone-100">Unable to load workspace</h3>
        <p className="text-sm text-stone-400 mt-2 mb-4">
          Please check your connection and sign in again.
        </p>
        <button
          onClick={() => fetchOverview()}
          className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 bg-stone-900" />
            <Skeleton className="h-8 w-52 bg-stone-900" />
          </div>
          <Skeleton className="h-10 w-32 bg-stone-900 rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full bg-stone-900 rounded-lg" />
        <Skeleton className="h-64 w-full bg-stone-900 rounded-lg" />
      </div>
    );
  }

  const isConnected = overview?.connection?.connected;
  const totalObjects = overview?.buckets.reduce((acc, b) => acc + (b.objectCount || 0), 0) || 0;
  const used = formatBytesComponents(overview?.usage.usedBytes || 0);
  const limitFormatted = formatBytes(overview?.usage.limitBytes || 15 * 1024 * 1024 * 1024);
  const usagePercentage = Math.min(100, Math.max(1, overview?.usage.percentage || 0));

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold text-stone-100">Overview</h1>
          <p className="mt-1 text-sm text-stone-400">Manage buckets, monitor storage quota, and configure access.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Create bucket
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Storage used</div>
          <div className="text-2xl font-semibold text-stone-100 mt-2">
            {used.value} <span className="text-base font-normal text-stone-400">{used.unit}</span>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="text-xs text-stone-400 mt-2">{usagePercentage}% of {limitFormatted} used</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total objects</div>
          <div className="text-2xl font-semibold text-stone-100 mt-2">{totalObjects}</div>
          <div className="text-xs text-stone-400 mt-4">Across all buckets</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Storage status</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-lg font-medium text-stone-100">{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="text-xs text-stone-400 mt-3 truncate">{overview?.connection.email || "Google Drive"}</div>
        </div>
      </div>

      {/* UNCONNECTED CALLOUT BANNER IF DRIVE NOT CONNECTED */}
      {!isConnected && (
        <div className="p-6 border border-stone-800 rounded-lg bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base text-stone-100 font-medium">Connect your Google Drive</h4>
            <p className="text-sm text-stone-400 mt-1 max-w-xl">
              Link your Google account to store files. BYOS only requests access to files it creates inside your Drive.
            </p>
          </div>
          <a
            href="/api/auth/google/connect"
            className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
          >
            <HardDrive size={15} /> Connect Drive <ArrowUpRight size={14} />
          </a>
        </div>
      )}

      {/* BUCKETS TABLE */}
      <div className="border border-stone-800 rounded-lg overflow-hidden bg-stone-900/40">
        <div className="px-5 py-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-100">Storage Buckets</h2>
          <span className="text-xs text-stone-400">{overview?.buckets.length || 0} active</span>
        </div>

        {overview?.buckets.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-400">
            No buckets yet. Click <span className="text-emerald-400 font-medium">+ Create bucket</span> above to create your first bucket.
          </div>
        ) : (
          <div className="divide-y divide-stone-800/60">
            {overview?.buckets.map((b) => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between hover:bg-stone-800/30 transition-colors">
                <Link
                  href={`/objects?bucket=${encodeURIComponent(b.name)}`}
                  className="flex items-center gap-3 font-medium text-stone-100 hover:text-emerald-400 transition-colors"
                >
                  <Folder size={18} className="text-emerald-400" />
                  <span>{b.name}</span>
                </Link>
                <div className="flex items-center gap-6 text-sm text-stone-400">
                  <span>{b.objectCount} {b.objectCount === 1 ? "object" : "objects"}</span>
                  <Link
                    href={`/objects?bucket=${encodeURIComponent(b.name)}`}
                    className="text-stone-400 hover:text-stone-100 inline-flex items-center gap-1 text-xs"
                  >
                    Browse <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE BUCKET DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-stone-900 border border-stone-800 text-stone-100 sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-stone-100">
              Create bucket
            </DialogTitle>
            <DialogDescription className="text-sm text-stone-400 mt-1">
              A corresponding folder will be created inside your connected Google Drive.
            </DialogDescription>
          </DialogHeader>

          {bucketError && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
              {bucketError}
            </div>
          )}

          <form onSubmit={handleCreateBucket} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm mb-2 text-stone-200">
                Bucket name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. app-assets"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-400 text-sm"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingBucket}
                className="px-4 py-2.5 rounded-lg text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBucket || !newBucketName.trim()}
                className="inline-flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {creatingBucket ? "Creating…" : "Create bucket"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
