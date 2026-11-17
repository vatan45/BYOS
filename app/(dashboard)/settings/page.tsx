"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  HardDrive,
  LogOut,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div
        role="alert"
        className="rounded-xl border border-stone-800 bg-stone-900/60 p-8 space-y-4 max-w-xl mx-auto text-center"
      >
        <h1 className="text-xl font-medium text-white">Unable to load settings</h1>
        <p className="text-sm text-stone-400">
          Check your connection and sign in again.
        </p>
        <Button
          onClick={() => fetchOverview()}
          className="rounded-lg bg-emerald-400 text-stone-950 px-4 py-2 text-xs font-medium"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (loading || !overview) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <Skeleton className="h-8 w-48 bg-stone-900 rounded-lg" />
        <Skeleton className="h-64 w-full bg-stone-900 rounded-xl" />
        <Skeleton className="h-64 w-full bg-stone-900 rounded-xl" />
      </div>
    );
  }

  const isConnected = overview.connection.connected;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="border-b border-stone-800/80 pb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center space-x-2.5">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>Settings</span>
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Connected storage, account plan, and credentials.
        </p>
      </div>

      {/* STORAGE CONNECTION CARD */}
      <Card className="p-6 rounded-xl border-stone-800/80 bg-stone-900/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-medium text-white">
                  Google Drive
                </h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-stone-800 text-stone-400 border-stone-700"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {isConnected
                  ? overview.connection.email
                  : "Connect your Google account to store files."}
              </p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="border-stone-800 hover:bg-stone-800 text-stone-300 hover:text-rose-400 text-xs rounded-lg px-3 py-1.5"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            ) : (
              <a
                href="/api/auth/google/connect"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium text-xs space-x-1.5 transition-colors"
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>Connect Google Drive</span>
              </a>
            )}
          </div>
        </div>

        {/* SAFE DISCONNECTION NOTE */}
        <div className="p-4 rounded-lg bg-stone-900/60 border border-stone-800 text-xs text-stone-400 space-y-1">
          <p className="font-medium text-stone-300">Your files remain in Google Drive</p>
          <p className="leading-relaxed">
            Disconnecting removes the OAuth tokens used for API access, but does not delete any files. Everything created by BYOS remains in your Google Drive and accessible anytime.
          </p>
        </div>

        {/* SECURITY & PRIVACY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-lg bg-[#0c0e0d] border border-stone-800/80 space-y-1">
            <div className="text-emerald-400 font-medium flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Isolated scope</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Access is limited to the <code className="text-stone-300 font-mono">drive.file</code> scope. BYOS cannot access other files in your Drive.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0c0e0d] border border-stone-800/80 space-y-1">
            <div className="text-emerald-400 font-medium flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Direct transfers</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Files are transferred directly using signed URLs, with no intermediate storage proxies or egress fees.
            </p>
          </div>
        </div>
      </Card>

      {/* ACCOUNT PLAN */}
      <Card className="p-6 rounded-xl border-stone-800/80 bg-stone-900/40 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="font-medium text-white text-base">
                Plan & limits
              </h2>
              <p className="text-xs text-stone-400">
                Your current workspace tier and quotas.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 border-stone-700 text-xs font-mono uppercase"
          >
            {overview.user.plan}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-[#0c0e0d] border border-stone-800/80 space-y-3">
            <div className="flex justify-between items-center font-medium text-stone-300">
              <span>Free tier</span>
              <span className="text-stone-500">$0/mo</span>
            </div>
            <ul className="space-y-1.5 text-stone-400">
              <li>1 storage bucket</li>
              <li>20 active API keys</li>
              <li>Standard rate limits (100 req/min)</li>
              <li>Google Drive storage limit applies</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#0c0e0d] border border-stone-800/80 space-y-3">
            <div className="flex justify-between items-center font-medium text-stone-300">
              <span>Pro tier</span>
              <span className="text-emerald-400">Upgrade</span>
            </div>
            <ul className="space-y-1.5 text-stone-400">
              <li>Unlimited storage buckets</li>
              <li>Unlimited active API keys</li>
              <li>High-throughput rate limits (1,000 req/min)</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
