"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Folder,
  ArrowUpRight,
  HardDrive,
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
      <div className="p-8 border border-[#292d29] rounded-lg bg-[#111411] text-center max-w-md mx-auto my-12">
        <h3 className="text-lg font-medium text-[#f0f2eb]">Unable to load workspace</h3>
        <p className="text-xs text-[#929a8d] mt-2 mb-4">
          Please check your connection and sign in again.
        </p>
        <button
          onClick={() => fetchOverview()}
          className="action small"
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
            <Skeleton className="h-3 w-40 bg-[#161a16]" />
            <Skeleton className="h-6 w-52 bg-[#161a16]" />
          </div>
          <Skeleton className="h-8 w-28 bg-[#161a16] rounded" />
        </div>
        <Skeleton className="h-32 w-full bg-[#161a16] rounded-lg" />
        <Skeleton className="h-64 w-full bg-[#161a16] rounded-lg" />
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
      {/* HEADING - EXACT LANDING PREVIEW STYLE */}
      <div className="preview-heading">
        <div>
          <span className="muted">YOUR WORKSPACE, AT A GLANCE</span>
          <h3>Storage overview</h3>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="preview-create"
        >
          + Create bucket
        </button>
      </div>

      {/* STATS STRIP - EXACT LANDING PREVIEW STYLE */}
      <div className="preview-stats">
        <div>
          <span>Storage used</span>
          <strong>
            {used.value} <small>{used.unit}</small>
          </strong>
          <div className="usage-track">
            <i style={{ width: `${usagePercentage}%` }} />
          </div>
          <small>of {limitFormatted} available</small>
        </div>
        <div>
          <span>Total objects</span>
          <strong>{totalObjects}</strong>
          <small>Across your workspace</small>
        </div>
        <div>
          <span>Active buckets</span>
          <strong>{overview?.buckets.length || 0}</strong>
          <small>{isConnected ? "Connected to Google Drive" : "Connect Drive in Settings"}</small>
        </div>
      </div>

      {/* UNCONNECTED CALLOUT BANNER IF DRIVE NOT CONNECTED */}
      {!isConnected && (
        <div className="p-6 border border-[#343a31] rounded-lg bg-[#111411] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="muted">ACTION REQUIRED</span>
            <h4 className="text-base text-[#f0f2eb] font-medium mt-1">Connect your Google Drive</h4>
            <p className="text-xs text-[#929a8d] mt-1 max-w-xl">
              Link your Google account to store files. BYOS only requests access to files it creates.
            </p>
          </div>
          <a href="/api/auth/google/connect" className="action small shrink-0">
            <HardDrive size={14} /> Connect Drive <ArrowUpRight size={13} />
          </a>
        </div>
      )}

      {/* BUCKETS TABLE - EXACT LANDING PREVIEW STYLE */}
      <div className="preview-table">
        <div>
          <span>BUCKET NAME</span>
          <span>OBJECTS</span>
          <span>STATUS</span>
        </div>

        {overview?.buckets.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#929a8d]">
            No buckets yet. Click <span className="text-[#d8f99c] font-medium">+ Create bucket</span> above to create your first bucket.
          </div>
        ) : (
          overview?.buckets.map((b) => (
            <div key={b.id}>
              <span>
                <Folder size={16} className="text-[#d8f99c]" />
                <Link
                  href={`/objects?bucket=${b.name}`}
                  className="hover:underline text-[#f0f2eb] font-medium"
                >
                  {b.name}
                </Link>
              </span>
              <span className="text-[#d3d9cc]">{b.objectCount}</span>
              <span className="connected">
                Connected <ArrowUpRight size={13} />
              </span>
            </div>
          ))
        )}
      </div>

      {/* CREATE BUCKET DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#111411] border-[#292d29] text-[#f0f2eb] sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-[#f0f2eb]">
              Create bucket
            </DialogTitle>
            <DialogDescription className="text-xs text-[#929a8d]">
              A corresponding folder will be created in your connected Google Drive.
            </DialogDescription>
          </DialogHeader>

          {bucketError && (
            <div className="p-3 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
              {bucketError}
            </div>
          )}

          <form onSubmit={handleCreateBucket} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#929a8d]">
                Bucket name
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. app-assets"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                className="bg-[#0c0e0d] border-[#292d29] text-[#f0f2eb] font-mono text-sm focus-visible:ring-[#d8f99c] rounded"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingBucket}
                className="text-xs text-[#929a8d] hover:text-[#f0f2eb]"
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={creatingBucket || !newBucketName.trim()}
                className="action small !py-2 !px-4"
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
