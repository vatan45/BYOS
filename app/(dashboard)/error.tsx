"use client";

import React, { useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full bg-stone-900/60 border border-stone-800 p-6 rounded-xl text-center space-y-4">
        <CardHeader className="p-0 flex flex-col items-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 mb-1">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-white">
            Something went wrong
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">
            An unexpected error occurred while loading this view. Your files and data are unaffected.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => reset()}
              className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium text-xs px-4 py-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.assign("/dashboard")}
              className="border-stone-800 hover:bg-stone-800 text-stone-300 text-xs rounded-lg px-4 py-2"
            >
              Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
