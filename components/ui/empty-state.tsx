"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  badgeText?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
  badgeText = "System Status",
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-800 bg-stone-900/30 px-8 py-16 text-center shadow-inner overflow-hidden max-w-4xl mx-auto my-8",
        className
      )}
    >
      {/* Background glow and decorative elements */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/5 blur-[80px]" />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        {icon && (
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 border border-stone-800 text-stone-400 shadow-xl">
            {icon}
          </div>
        )}

        {badgeText && (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/60 text-stone-400 font-mono text-[11px] uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{badgeText}</span>
          </span>
        )}

        <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-2">
          {title}
        </h3>

        <p className="text-sm text-stone-400 leading-relaxed font-sans mb-6">
          {description}
        </p>

        {action && <div className="flex w-full items-center justify-center">{action}</div>}
      </div>
    </div>
  );
};
