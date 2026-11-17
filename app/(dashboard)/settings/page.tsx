"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  HardDrive,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface OverviewData {
  user: { id: string; email: string; plan: string };
  connection: { connected: boolean; email: string | null; status: string };
}

export default function SettingsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);

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
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect Google Drive? Your files will remain intact in your Google Drive."
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success("Google Drive disconnected");
        fetchOverview();
        router.refresh();
      } else {
        toast.error("Failed to disconnect Google Drive");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!loading && !overview) {
    return (
      <div className="p-8 border border-stone-800 rounded-lg bg-stone-900 text-center max-w-md mx-auto my-12">
        <h3 className="text-lg font-medium text-stone-100">Unable to load settings</h3>
        <p className="text-sm text-stone-400 mt-2 mb-4">
          Check your connection and sign in again.
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

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-36 bg-stone-900" />
        <Skeleton className="h-44 w-full bg-stone-900 rounded-lg" />
        <Skeleton className="h-44 w-full bg-stone-900 rounded-lg" />
      </div>
    );
  }

  const isConnected = overview.connection.connected;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* HEADING */}
      <div>
        <h1 className="text-3xl tracking-tight font-semibold text-stone-100">Settings</h1>
        <p className="mt-1 text-sm text-stone-400">Manage storage provider connections and workspace subscription limits.</p>
      </div>

      {/* STORAGE CONNECTION SECTION */}
      <div className="border border-stone-800 rounded-lg bg-stone-900 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-stone-100">Google Drive</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isConnected ? "bg-emerald-400/10 text-emerald-400" : "bg-stone-800 text-stone-400"
                }`}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-sm text-stone-400 mt-0.5">
                {isConnected
                  ? overview.connection.email
                  : "Connect your Google account to store files."}
              </p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={13} />
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <a
                href="/api/auth/google/connect"
                className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <HardDrive size={15} /> Connect Drive <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-stone-800/80 text-xs text-stone-400 space-y-1">
          <span className="text-stone-300 font-medium block">Your files stay in your Google Drive</span>
          <p>
            Disconnecting removes the API session, but does not delete any of your files. All buckets and objects remain in your Google Drive.
          </p>
        </div>
      </div>

      {/* ACCOUNT PLAN SECTION */}
      <div className="border border-stone-800 rounded-lg bg-stone-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-medium text-stone-100">Subscription & limits</h4>
            <p className="text-sm text-stone-400 mt-0.5">Current quota and entitlement tier</p>
          </div>
          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-medium">
            {overview.user.plan} plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 rounded-lg border border-stone-800 bg-stone-950 space-y-2">
            <span className="font-medium text-stone-100 text-sm block">Free plan</span>
            <ul className="space-y-1.5 text-stone-400 text-xs">
              <li>• 1 storage bucket</li>
              <li>• 20 active API keys</li>
              <li>• 100 requests/minute</li>
              <li>• Google Drive storage limits</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-stone-800 bg-stone-950 space-y-2">
            <span className="font-medium text-stone-100 text-sm block">Pro plan</span>
            <ul className="space-y-1.5 text-stone-400 text-xs">
              <li>• Unlimited storage buckets</li>
              <li>• Unlimited active API keys</li>
              <li>• 1,000 requests/minute</li>
              <li>• Priority support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
