"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  return (
    <div className="w-full">
      <div className="relative max-w-3xl mx-auto">
        {data.map((item, index) => (
          <div key={index} className="flex gap-6 md:gap-10 pb-10">
            {/* Dot + Line */}
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-700 z-10">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              {index !== data.length - 1 && (
                <div className="w-px flex-1 bg-gradient-to-b from-stone-700 to-stone-900" />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 pt-1.5">
              <h3 className="text-lg md:text-xl font-bold text-stone-100 mb-2">
                {item.title}
              </h3>
              <div className="text-stone-400 text-sm md:text-base">
                {item.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
