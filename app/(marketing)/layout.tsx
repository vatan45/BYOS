import React from "react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans antialiased selection:bg-emerald-500 selection:text-stone-950 overflow-x-hidden">
      {children}
    </div>
  );
}
