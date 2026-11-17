"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Zap,
  DollarSign,
  Lock,
  LogOut,
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
    } catch (e) {
      console.error("Error fetching settings profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you certain you wish to pause storage access and disconnect Google Drive? Your existing files will remain fully intact inside your personal Google Drive."
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: overview?.user.id || "00000000-0000-0000-0000-000000000000",
        }),
      });
      if (res.ok) {
        toast.success(
          "Google Drive disconnected cleanly! Developer API operations have been paused."
        );
        fetchOverview();
        router.refresh();
      } else {
        toast.error("Disconnect operation encountered an error.");
      }
    } catch {
      toast.error("Network exception communicating with disconnect endpoint.");
    } finally {
      setDisconnecting(false);
    }
  };

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
      <div className="space-y-8 max-w-5xl mx-auto pb-16">
        <div className="pb-6 border-b border-stone-800 space-y-2">
          <Skeleton className="h-8 w-72 bg-stone-900" />
          <Skeleton className="h-4 w-96 bg-stone-900" />
        </div>
        <Skeleton className="h-64 w-full bg-stone-900 rounded-3xl" />
        <Skeleton className="h-64 w-full bg-stone-900 rounded-3xl" />
      </div>
    );
  }

  const isConnected = overview?.connection?.connected;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* HEADER */}
      <div className="border-b border-stone-800 pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <Settings className="w-7 h-7 text-emerald-400 shrink-0" />
          <span>Storage Connection & Account Settings</span>
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Manage your Google OAuth token bindings, privacy guarantees, and SaaS
          subscription tiers.
        </p>
      </div>

      {/* STORAGE PROVIDER CONNECTION CARD */}
      <Card className="p-6 md:p-8 rounded-3xl border-stone-800 bg-stone-900/60 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-emerald-500/30 flex items-center justify-center shadow-md shrink-0">
              <HardDrive className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-semibold text-white text-base">
                  Google Drive Storage
                </h2>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-mono font-medium ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-stone-800 text-stone-400 border-stone-700"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {isConnected
                  ? `Connected account: ${overview?.connection.email}`
                  : "Not currently connected to Google Drive"}
              </p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="bg-stone-900 hover:bg-stone-800 text-rose-400 border-stone-800 text-xs font-medium rounded-lg px-4 py-2"
              >
                <LogOut className="w-3.5 h-3.5 mr-2 shrink-0" />
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <a
                href="/api/auth/google/connect"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
              >
                <Zap className="w-4 h-4 shrink-0 fill-current" />
                <span>Connect Google Drive Now</span>
              </a>
            )}
          </div>
        </div>

        {/* ZERO-DELETION GUARANTEE ALERT BOX */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 font-sans">
          <div className="font-extrabold text-amber-300 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>⚠️ Safe Disconnection & Zero-Deletion Guarantee</span>
          </div>
          <p className="leading-relaxed text-stone-300">
            Unlinking your account revokes BYOS developer OAuth tokens
            immediately, pausing programmatic S3 Read/Write operations.{" "}
            <strong className="text-white underline decoration-amber-500">
              Nothing gets deleted from your cloud account!
            </strong>{" "}
            Every file and folder provisioned by BYOS remains completely intact
            and accessible inside your personal Google Drive via standard web or
            desktop apps. You can safely reconnect or pause access whenever you
            wish.
          </p>
        </div>

        {/* SECURITY & PRIVACY BULLETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
            <div className="text-emerald-400 font-bold flex items-center space-x-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Restricted Scope Encryption</span>
            </div>
            <p className="text-stone-400 text-[11px] font-sans">
              Tokens are encrypted at rest using AES-256-GCM. We never request
              full Google Drive authorization—our access is strictly scoped to{" "}
              <code className="text-cyan-300">
                https://www.googleapis.com/auth/drive.file
              </code>
              .
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
            <div className="text-cyan-400 font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Real-Time Egress & Latency</span>
            </div>
            <p className="text-stone-400 text-[11px] font-sans">
              Direct streaming architectures bypass proxy servers during uploads
              and downloads via signed transfer tokens, eliminating AWS
              bandwidth costs and optimizing throughput.
            </p>
          </div>
        </div>
      </Card>

      {/* ACCOUNT TIER & MONETIZATION SUBSCRIPTION */}
      <Card className="p-6 md:p-8 rounded-3xl border-stone-800 bg-stone-900/60 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <h2 className="font-extrabold text-white text-lg">
                Platform Plan & Quotas
              </h2>
              <p className="text-xs text-stone-400">
                SaaS usage monetization, API rate limiting, and volume limits
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-xs font-mono font-extrabold uppercase"
          >
            Current Tier: {overview?.user.plan.toUpperCase()} PLAN
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
          {/* Free Tier Details */}
          <div className="p-6 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-4">
            <div className="flex justify-between items-center font-bold text-stone-300 text-sm">
              <span>Free Developer Tier</span>
              <span className="text-stone-500">$0 / mo</span>
            </div>
            <ul className="space-y-2.5 text-stone-400">
              <li className="flex items-center space-x-2">
                <span>
                  ▪️ Max Storage Buckets:{" "}
                  <strong className="text-stone-200">1 Bucket</strong>
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>
                  ▪️ Active API Keys Quota:{" "}
                  <strong className="text-stone-200">20 Keys</strong>
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>
                  ▪️ Rate Limit Protection:{" "}
                  <strong className="text-stone-200">100 req / minute</strong>
                </span>
              </li>
            </ul>
          </div>

          {/* PRO Tier Details */}
          <div className="p-6 rounded-2xl bg-stone-950 border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)] space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] bg-emerald-500 text-stone-950 font-extrabold font-mono uppercase">
              Your Active Plan
            </div>
            <div className="font-extrabold text-emerald-300 text-base flex items-center space-x-1.5">
              <span>PRO Enterprise Unlimited</span>
              <span className="text-xs text-stone-400 font-normal">
                ($19 / mo)
              </span>
            </div>
            <ul className="space-y-2.5 text-stone-200 font-medium">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Max Storage Buckets:{" "}
                  <strong className="text-white font-extrabold">
                    UNLIMITED
                  </strong>
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Active API Keys Quota:{" "}
                  <strong className="text-white font-extrabold">
                    UNLIMITED
                  </strong>
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Rate Limit Protection:{" "}
                  <strong className="text-white font-extrabold">
                    10,000 req / minute
                  </strong>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
