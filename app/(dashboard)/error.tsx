"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/monitoring";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    captureException(error, {
      component: "DashboardErrorBoundary",
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <Card className="max-w-md w-full bg-stone-900/90 border-2 border-rose-500/40 p-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] text-center space-y-4">
        <CardHeader className="p-0 flex flex-col items-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
            <AlertOctagon className="w-8 h-8 animate-pulse" />
          </div>
          <CardTitle className="text-xl font-extrabold text-white tracking-tight">
            Unexpected Dashboard Fault
          </CardTitle>
          <CardDescription className="text-stone-400 text-xs font-mono">
            Error ID: {error.digest || "RUNTIME_CLIENT_EXCEPTION"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          <p className="text-sm text-stone-300 font-sans leading-relaxed">
            An unexpected error occurred while rendering this view. Our monitoring system has recorded the fault telemetry for investigation. Your underlying Google Drive files remain completely safe and unharmed.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => reset()}
              className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs px-5 py-5 rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2 shrink-0 animate-spin-once" />
              Retry & Reload View
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.assign("/dashboard")}
              className="bg-stone-950 hover:bg-stone-800 text-stone-300 border-stone-800 text-xs font-bold px-5 py-5 rounded-xl"
            >
              Back to Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
