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
      <div className="p-8 border border-[#292d29] rounded-lg bg-[#111411] text-center max-w-md mx-auto my-12">
        <h3 className="text-lg font-medium text-[#f0f2eb]">Unable to load settings</h3>
        <p className="text-xs text-[#929a8d] mt-2 mb-4">
          Check your connection and sign in again.
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

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-36 bg-[#161a16]" />
        <Skeleton className="h-44 w-full bg-[#161a16] rounded-lg" />
        <Skeleton className="h-44 w-full bg-[#161a16] rounded-lg" />
      </div>
    );
  }

  const isConnected = overview.connection.connected;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* HEADING */}
      <div className="preview-heading">
        <div>
          <span className="muted">PREFERENCES & STORAGE</span>
          <h3>Settings</h3>
        </div>
      </div>

      {/* STORAGE CONNECTION SECTION */}
      <div className="border border-[#292d29] rounded-lg bg-[#111411] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#1a2018] flex items-center justify-center text-[#d8f99c] shrink-0">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#f0f2eb]">Google Drive</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0c0e0d] border border-[#292d29] text-[#929a8d]">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-xs text-[#929a8d] mt-0.5">
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
                className="text-xs border border-[#292d29] hover:border-rose-500/40 text-[#929a8d] hover:text-rose-400 rounded px-3 py-1.5 flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={13} />
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <a
                href="/api/auth/google/connect"
                className="action small"
              >
                <HardDrive size={13} /> Connect Drive <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#242a22] text-xs text-[#929a8d] space-y-1">
          <span className="text-stone-300 font-medium block">Your files stay in your Google Drive</span>
          <p>
            Disconnecting removes the API session, but does not delete any of your files. All buckets and objects remain in your Google Drive.
          </p>
        </div>
      </div>

      {/* ACCOUNT PLAN SECTION */}
      <div className="border border-[#292d29] rounded-lg bg-[#111411] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="muted">SUBSCRIPTION</span>
            <h4 className="text-sm font-medium text-[#f0f2eb] mt-1">Plan and limits</h4>
          </div>
          <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#0c0e0d] border border-[#292d29] text-[#d8f99c]">
            {overview.user.plan} plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 rounded border border-[#242a22] bg-[#0c0e0d] space-y-2">
            <span className="font-medium text-[#f0f2eb] block">Free plan</span>
            <ul className="space-y-1 text-[#929a8d]">
              <li>• 1 storage bucket</li>
              <li>• 20 active API keys</li>
              <li>• 100 requests/minute</li>
              <li>• Google Drive storage limits</li>
            </ul>
          </div>

          <div className="p-4 rounded border border-[#242a22] bg-[#0c0e0d] space-y-2">
            <span className="font-medium text-[#f0f2eb] block">Pro plan</span>
            <ul className="space-y-1 text-[#929a8d]">
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
