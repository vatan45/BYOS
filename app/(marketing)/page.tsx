"use client";

import React from "react";
import Link from "next/link";
import {
  Database,
  Terminal,
  Key,
  FolderTree,
  History,
  ShieldCheck,
  Zap,
  Check,
  ArrowRight,
  Code2,
  Lock,
  Server,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { SparklesCore } from "@/components/ui/sparkles";
import { Timeline } from "@/components/ui/timeline";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function LandingPage() {
  const timelineData = [
    {
      title: "1. Create Developer Account",
      content: (
        <div className="space-y-2 text-stone-300">
          <p>
            Authenticate in seconds using enterprise Supabase security (email/password or single-click Google identity verification).
          </p>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-emerald-400">
            ✓ Zero-trust developer authentication initialized
          </div>
        </div>
      ),
    },
    {
      title: "2. Connect Google Drive via OAuth",
      content: (
        <div className="space-y-2 text-stone-300">
          <p>
            Authorize our secure OAuth 2.0 translation adapter. We request read/write access strictly restricted to the BYOS folder you authorize &mdash; we can never view your personal photos, spreadsheets, or docs.
          </p>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-cyan-400">
            ✓ Scoped Google Drive provider linked & tokens encrypted
          </div>
        </div>
      ),
    },
    {
      title: "3. Isolated BYOS Folder Initialized",
      content: (
        <div className="space-y-2 text-stone-300">
          <p>
            Our engine automatically scaffolds a dedicated root directory inside your Google Drive. This acts as the physical persistence layer for all your virtual S3 object buckets.
          </p>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-stone-300">
            📁 Drive Root / BYOS_Storage_Engine / [Bucket_UUID]
          </div>
        </div>
      ),
    },
    {
      title: "4. S3-Compatible Endpoints Exposed",
      content: (
        <div className="space-y-2 text-stone-300">
          <p>
            Generate restricted API secret keys with granular IAM scopes (read, write, delete, list) and file prefix barriers. Presigned file-transfer URLs bypass proxy server memory entirely.
          </p>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-emerald-400">
            🔑 byos_live_JPUTp5xl9x... &mdash; Scopes: [READ, WRITE, DELETE]
          </div>
        </div>
      ),
    },
    {
      title: "5. Plug in SDK & View Realtime Telemetry",
      content: (
        <div className="space-y-2 text-stone-300">
          <p>
            Drop our standard Node.js/TypeScript SDK into your applications or configure AWS S3 SDK endpoints directly. Track upload throughput, bandwidth savings, and historical file snapshots from your interactive dashboard.
          </p>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-cyan-400">
            ⚡ 0.00% AWS S3 egress markup fees &mdash; Pure native Drive speed
          </div>
        </div>
      ),
    },
  ];

  const testimonialItems = [
    {
      quote:
        "BYOS completely eliminated our monthly cloud storage hosting costs for user uploads. We simply connected a generic Google Workspace drive and pointed our backend S3 client to the BYOS translation endpoint.",
      name: "Marcus Vance",
      title: "Lead Infrastructure Architect, DevStack AI",
    },
    {
      quote:
        "The presigned zero-trust URL architecture is incredible. Files stream directly between the browser and Google Drive without ever eating up our backend Vercel hosting serverless memory.",
      name: "Elena Rostova",
      title: "Senior Full-Stack Engineer, Formulate SaaS",
    },
    {
      quote:
        "We needed historical file versioning and automated retention pruning without paying AWS Glacier storage tier penalties. BYOS solved this out-of-the-box in less than 30 minutes of setup.",
      name: "David Chen",
      title: "CTO, SyncMatrix Tech",
    },
    {
      quote:
        "Finally, an object storage platform built with developer aesthetics and simplicity in mind. No complicated AWS IAM JSON schemas or unexpected bandwidth overage charges.",
      name: "Sarah Jenkins",
      title: "Principal Developer Advocate, CloudScale",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-stone-950 text-stone-100 font-sans">
      {/* 1. STICKY NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-stone-800 bg-stone-950/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5 text-stone-950 stroke-[2.5]" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-lg tracking-tight">BYOS</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30 font-semibold uppercase tracking-wider">
                S3 Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-400">
            <a href="#workflow" className="hover:text-stone-100 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-stone-100 transition-colors">Features</a>
            <a href="#quickstart" className="hover:text-stone-100 transition-colors">SDK Quickstart</a>
            <a href="#pricing" className="hover:text-stone-100 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-stone-100 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="font-extrabold bg-gradient-to-r from-emerald-500 to-teal-400 text-stone-950 hover:opacity-90 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-0">
                Get Started <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (AURORA BACKGROUND + TEXT GENERATE) */}
      <section className="relative">
        <AuroraBackground className="h-[90vh] min-h-[650px]">
          <div className="relative z-10 mx-auto max-w-5xl text-center px-6 pt-12 flex flex-col items-center justify-center">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-stone-900/90 border border-stone-800 text-stone-300 text-xs font-mono font-semibold mb-6 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400">RELEASE 1.0:</span>
              <span>Zero-Trust Google Drive Object Translation Engine</span>
            </div>

            <TextGenerateEffect
              words="Turn Your Google Drive Into an S3-Compatible Storage Engine."
              className="max-w-4xl font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-none"
            />

            <p className="mt-6 text-lg sm:text-xl text-stone-400 max-w-2xl font-normal leading-relaxed">
              Bypass cloud vendor lock-in and inflated bandwidth bills with a drop-in <strong className="text-stone-200">S3 API & TypeScript SDK</strong>. Powered by O(1) indexed lookups, zero-trust folder isolation, and <span className="text-emerald-400 font-mono font-semibold">$0.00 vendor storage markups</span>.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base font-extrabold bg-emerald-500 text-stone-950 hover:bg-emerald-400 px-8 py-6 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-transform">
                  Connect Google Drive
                </Button>
              </Link>
              <a href="#quickstart" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-bold px-8 py-6 rounded-xl border-stone-700 hover:bg-stone-900 text-stone-200">
                  Explore Node.js SDK
                </Button>
              </a>
            </div>

            <div className="mt-12 flex items-center justify-center space-x-8 text-xs font-mono text-stone-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Server File Stash</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Scoped OAuth folder access</span>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Presigned browser transfers</span>
              </div>
            </div>
          </div>
        </AuroraBackground>
      </section>

      {/* 3. HOW IT WORKS (TIMELINE COMPONENT) */}
      <section id="workflow" className="py-24 max-w-7xl mx-auto px-6 sm:px-8 border-t border-stone-800/60">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
            Architecture & Workflow
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">
            How BYOS Translates Drive into S3
          </h2>
          <p className="text-stone-400 text-base mt-4">
            Five frictionless steps from standard OAuth authorization to enterprise cloud object streaming.
          </p>
        </div>

        <Timeline data={timelineData} />
      </section>

      {/* 4. FEATURES GRID (BENTO GRID COMPONENT) */}
      <section id="features" className="py-24 bg-stone-950 border-t border-stone-800/60 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">
              Engineered for Pure Developer Ergonomics
            </h2>
            <p className="text-stone-400 text-base mt-4">
              Everything you expect from Amazon S3, built on top of your existing Google Workspace disk space.
            </p>
          </div>

          <BentoGrid className="max-w-6xl">
            <BentoGridItem
              title="Drop-In S3 API Translation"
              description="Standard PUT, GET, DELETE, and LIST endpoints. Swap out your AWS endpoint URL and keep 100% of your existing storage code."
              icon={<Server className="w-8 h-8 text-emerald-400 mb-2" />}
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-stone-900/80 border border-stone-800/80 p-4 font-mono text-[11px] text-stone-300 flex-col justify-center space-y-1">
                  <div className="text-emerald-400 font-bold">$ curl -X PUT https://api.byos.dev/v1/buckets/prod-assets/logo.png \</div>
                  <div className="text-stone-500">&nbsp;&nbsp;-H &quot;Authorization: Bearer byos_live_xxx&quot;</div>
                  <div className="text-cyan-300">&gt; HTTP/1.1 200 OK [ETag: &quot;e4c8f...&quot;, Size: 42081]</div>
                </div>
              }
              className="md:col-span-2 bg-stone-900/40 hover:border-emerald-500/40"
            />
            <BentoGridItem
              title="Lightweight TypeScript SDK"
              description="Standalone Node.js & Edge SDK with automatic exponential backoff retries and connection polling."
              icon={<Code2 className="w-8 h-8 text-cyan-400 mb-2" />}
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-stone-900 to-cyan-950/30 border border-stone-800 flex-col items-center justify-center p-4">
                  <span className="font-mono text-xs font-bold text-cyan-400">npm install byos-sdk</span>
                  <span className="text-[10px] font-mono text-stone-500 mt-1">Zero dependencies &bull; 100% Typed</span>
                </div>
              }
              className="md:col-span-1 bg-stone-900/40 hover:border-cyan-500/40"
            />
            <BentoGridItem
              title="Presigned Zero-Trust URLs"
              description="Generate temporary 15-minute file upload and download URLs. Files transfer directly between browser and Google Drive without touching proxy servers."
              icon={<Key className="w-8 h-8 text-emerald-400 mb-2" />}
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-stone-900 border border-stone-800 p-4 font-mono text-xs text-emerald-400 flex flex-col justify-center">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>GRANT: PRE_SIGNED_PUT_OBJECT</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">TTL: 900s &bull; Direct Drive Streaming Adapter</div>
                </div>
              }
              className="md:col-span-1 bg-stone-900/40 hover:border-emerald-500/40"
            />
            <BentoGridItem
              title="Time-Machine Version Pruning"
              description="Protect critical file modifications. Automatically preserves the newest 10 file versions per object and scheduled BullMQ background cron workers clean up historical clutter."
              icon={<History className="w-8 h-8 text-purple-400 mb-2" />}
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-tr from-stone-900 via-purple-950/20 to-stone-900 border border-stone-800 p-4 font-mono text-xs text-stone-300 flex flex-col justify-center">
                  <div className="flex justify-between items-center text-[11px] text-emerald-400 font-bold">
                    <span>v4.0 (active pointer)</span> <span>Current</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-stone-500 border-t border-stone-800 mt-1 pt-1">
                    <span>v3.0 (reconciliation snapshot)</span> <span>2h ago</span>
                  </div>
                </div>
              }
              className="md:col-span-1 bg-stone-900/40 hover:border-purple-500/40"
            />
            <BentoGridItem
              title="Live Telemetry & Bandwidth Proxies"
              description="Hourly BullMQ usage rollup jobs aggregate API throughput by operation type, track top-accessed S3 keys, and calculate precise AWS cloud savings."
              icon={<Activity className="w-8 h-8 text-cyan-400 mb-2" />}
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-stone-900 border border-stone-800 p-4 flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-lg font-black text-white">100%</div>
                    <div className="text-[10px] font-mono text-stone-500">Uptime Proxy</div>
                  </div>
                  <div className="h-8 w-px bg-stone-800" />
                  <div className="text-center">
                    <div className="text-lg font-black text-emerald-400">~$0.00</div>
                    <div className="text-[10px] font-mono text-stone-500">AWS Egress Fees</div>
                  </div>
                </div>
              }
              className="md:col-span-1 bg-stone-900/40 hover:border-cyan-500/40"
            />
          </BentoGrid>
        </div>
      </section>

      {/* 5. PRODUCT VISUAL (5-LINE SDK QUICKSTART SHOWCASE) */}
      <section id="quickstart" className="py-24 max-w-6xl mx-auto px-6 sm:px-8 border-t border-stone-800/60">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Developer Quickstart
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Five Lines of Code to Connect Your Bucket
            </h2>
            <p className="text-stone-400 text-base mt-4 leading-relaxed">
              Our native TypeScript SDK provides a clean, type-safe wrapper around BYOS endpoints. Forget massive AWS SDK bundles and complex IAM role assumptions.
            </p>
            <div className="mt-6 space-y-3 font-mono text-xs text-stone-300">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automatic transient error exponential backoff recovery</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero server bandwidth overhead with presigned adapters</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Full TypeScript autocompletion and strict Zod validation</span>
              </div>
            </div>
            <div className="mt-8">
              <Link href="/signup">
                <Button className="font-extrabold bg-stone-800 hover:bg-stone-700 text-stone-200 px-6 py-3 rounded-xl border border-stone-700">
                  Generate Your API Secret Key &rarr;
                </Button>
              </Link>
            </div>
          </div>

          {/* Code Showcase Terminal Card */}
          <div className="rounded-2xl border-2 border-stone-800 bg-stone-900/90 p-6 shadow-[0_0_50px_rgba(16,185,129,0.15)] relative overflow-hidden transform hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4 font-mono text-xs text-stone-400">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 font-bold text-stone-300">app.ts</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-stone-800 text-stone-400">TypeScript</span>
            </div>
            <pre className="text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto text-stone-300">
              <code>
                <span className="text-purple-400">import</span> &#123; BYOSClient &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">&quot;byos-sdk&quot;</span>;<br /><br />
                <span className="text-stone-500">// 1. Initialize client with your developer secret</span><br />
                <span className="text-purple-400">const</span> client = <span className="text-purple-400">new</span> BYOSClient(&#123; apiKey: <span className="text-emerald-400">&quot;byos_live_xxxx&quot;</span> &#125;);<br /><br />
                <span className="text-stone-500">// 2. Upload file stream directly to Google Drive bucket</span><br />
                <span className="text-purple-400">const</span> file = <span className="text-purple-400">await</span> client.uploadObject(<span className="text-emerald-400">&quot;my-drive-bucket&quot;</span>, <span className="text-cyan-400">&quot;reports/annual.pdf&quot;</span>, buffer);<br /><br />
                <span className="text-stone-500">// 3. Generate a 15-minute zero-trust sharing link</span><br />
                <span className="text-purple-400">const</span> url = <span className="text-purple-400">await</span> client.getPresignedDownloadUrl(<span className="text-emerald-400">&quot;my-drive-bucket&quot;</span>, <span className="text-cyan-400">&quot;reports/annual.pdf&quot;</span>, <span className="text-amber-400">900</span>);<br /><br />
                console.log(<span className="text-emerald-400">&quot;Stream URL ready:&quot;</span>, url.downloadUrl);
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* 6. "STRIPE OF STORAGE" POSITIONING (SPARKLES COMPONENT) */}
      <section className="relative py-24 bg-stone-950 overflow-hidden border-t border-stone-800/60 flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="stripe-sparkles"
            background="transparent"
            minSize={0.5}
            maxSize={1.5}
            particleDensity={80}
            className="w-full h-full"
            particleColor="#10b981"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>The Stripe of Cloud Object Storage</span>
          </div>
          <h2 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-none">
            Zero Markup on Disk. <br /><span className="text-emerald-400">Pure Developer Ergonomics.</span>
          </h2>
          <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Why pay exorbitant monthly cloud hosting bills and bandwidth overage charges when you already own terabytes of Google Workspace storage? BYOS strips out the middleware markup and delivers uncompromised S3 speed.
          </p>
        </div>
      </section>

      {/* 7. SOCIAL PROOF / TESTIMONIALS (INFINITE MOVING CARDS) */}
      <section className="py-20 bg-stone-950 border-t border-stone-800/60">
        <div className="max-w-3xl mx-auto text-center mb-12 px-6">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
            Developer Trust
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Loved by Builders & Engineers
          </h2>
        </div>
        <InfiniteMovingCards items={testimonialItems} direction="right" speed="slow" />
      </section>

      {/* 8. PRICING SECTION (SHADCN CARDS - CLEAR & PLAIN) */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6 sm:px-8 border-t border-stone-800/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
            Predictable SaaS Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">
            Transparent Tiers. Zero Hidden Bandwidth Fees.
          </h2>
          <p className="text-stone-400 text-base mt-4">
            Start building for free on your existing Drive disk space. Upgrade for unlimited buckets and historical time-machine retention pruning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier Card */}
          <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-8 flex flex-col justify-between hover:border-stone-700 transition-colors">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-extrabold text-white">Free Starter Plan</h3>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-stone-800 text-stone-400">
                  Developer MVP
                </span>
              </div>
              <div className="text-4xl font-black text-white my-6">
                $0 <span className="text-base font-normal text-stone-500 font-sans">/ month forever</span>
              </div>
              <p className="text-stone-400 text-sm mb-6 pb-6 border-b border-stone-800">
                Ideal for prototypes, hackathon projects, and individual hobbyist file archives.
              </p>
              <ul className="space-y-4 text-sm text-stone-300 font-mono">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>1 Active Storage Bucket</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Your Google Drive disk storage quota</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Standard S3 API & SDK endpoints</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>15-Minute Presigned Transfer URLs</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link href="/signup">
                <Button variant="outline" className="w-full py-6 rounded-xl font-bold text-base border-stone-700 hover:bg-stone-800 text-white">
                  Start Free Deployment
                </Button>
              </Link>
            </div>
          </div>

          {/* Pro Tier Card */}
          <div className="rounded-3xl border-2 border-emerald-500/50 bg-stone-900 p-8 flex flex-col justify-between shadow-[0_0_50px_rgba(16,185,129,0.15)] relative">
            <div className="absolute -top-3 right-8 px-4 py-1 rounded-full bg-emerald-500 text-stone-950 font-mono text-xs font-extrabold uppercase tracking-wide shadow">
              Recommended Pro
            </div>
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-extrabold text-white">Pro Enterprise Engine</h3>
              </div>
              <div className="text-4xl font-black text-white my-6">
                $15 <span className="text-base font-normal text-stone-500 font-sans">/ month flat</span>
              </div>
              <p className="text-stone-300 text-sm mb-6 pb-6 border-b border-stone-800">
                Built for high-throughput production applications, SaaS platforms, and team storage collaboration.
              </p>
              <ul className="space-y-4 text-sm text-stone-200 font-mono">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 font-extrabold" />
                  <span className="font-bold text-white">Unlimited Storage Buckets</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 font-extrabold" />
                  <span className="font-bold text-white">Unlimited Active API Secret Keys</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Time-machine retention version pruning</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Real-time usage telemetry & analytics dashboard</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Priority background job queues & 99.9% proxy SLA</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link href="/signup">
                <Button className="w-full py-6 rounded-xl font-extrabold text-base bg-emerald-500 text-stone-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  Upgrade to Unlimited Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION (SHADCN ACCORDION) */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 sm:px-8 border-t border-stone-800/60">
        <div className="text-center mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="item-1" className="border border-stone-800 rounded-2xl px-6 bg-stone-900/40">
            <AccordionTrigger className="text-base font-bold text-white text-left hover:text-emerald-400">
              How does BYOS ensure zero-trust security for my Google Drive?
            </AccordionTrigger>
            <AccordionContent className="text-stone-300 text-sm leading-relaxed pt-2">
              When you connect your Google Account via OAuth 2.0, BYOS exclusively requests read/write permissions scoped solely to the files and folders created by the app (`https://www.googleapis.com/auth/drive.file`). We can never access your existing personal spreadsheets, photos, or documents. Moreover, you can revoke OAuth credentials at any moment directly from your Google Security settings or dashboard.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border border-stone-800 rounded-2xl px-6 bg-stone-900/40">
            <AccordionTrigger className="text-base font-bold text-white text-left hover:text-emerald-400">
              What happens if I exceed my Google Drive storage quota?
            </AccordionTrigger>
            <AccordionContent className="text-stone-300 text-sm leading-relaxed pt-2">
              Since BYOS streams files directly into your connected Google Drive account, your overall storage quota is governed by your Google account plan (15GB free, or up to several terabytes on Google One / Workspace). If your Drive reaches full capacity, Google API returns a standard quota error which BYOS translates into an S3 507 Insufficient Storage response. Simply free up Drive space or upgrade your Google storage plan to continue uploading instantly.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border border-stone-800 rounded-2xl px-6 bg-stone-900/40">
            <AccordionTrigger className="text-base font-bold text-white text-left hover:text-emerald-400">
              Can I use standard AWS S3 libraries and SDKs with BYOS?
            </AccordionTrigger>
            <AccordionContent className="text-stone-300 text-sm leading-relaxed pt-2">
              Yes! BYOS is designed as a drop-in API translator. You can configure almost any standard S3 client (such as AWS SDK for Node.js, Python boto3, or simple cURL adapters) by setting the custom endpoint URL to our API server and passing your BYOS API secret key as the authentication bearer token.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border border-stone-800 rounded-2xl px-6 bg-stone-900/40">
            <AccordionTrigger className="text-base font-bold text-white text-left hover:text-emerald-400">
              How do presigned zero-trust URLs work?
            </AccordionTrigger>
            <AccordionContent className="text-stone-300 text-sm leading-relaxed pt-2">
              When you call our presigned URL generation endpoints, BYOS validates your IAM key and issues a time-bound cryptographic token with a configurable Time-To-Live (up to 15 minutes). Your end-users can upload or download files directly from the browser using this URL without exposing your primary API secret keys or straining proxy server memory.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border border-stone-800 rounded-2xl px-6 bg-stone-900/40">
            <AccordionTrigger className="text-base font-bold text-white text-left hover:text-emerald-400">
              How does time-machine file versioning protect my data?
            </AccordionTrigger>
            <AccordionContent className="text-stone-300 text-sm leading-relaxed pt-2">
              When you overwrite an object key in BYOS, our engine creates a genuine duplicate file snapshot inside Google Drive instead of merely modifying pointers. Our automated BullMQ cron scheduler runs daily to prune historical clutter, preserving the newest 10 file versions per object so you can roll back data at any time without accumulating unnecessary cloud clutter.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* 10. FINAL CTA SECTION & FOOTER */}
      <section className="py-20 bg-stone-900 border-t border-stone-800 text-center px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to Reclaim Your Cloud Storage?
          </h2>
          <p className="text-stone-400 text-base max-w-xl mx-auto">
            Join developers building scalable web applications on top of zero-trust Google Drive storage today.
          </p>
          <div className="pt-4">
            <Link href="/signup">
              <Button size="lg" className="font-extrabold bg-emerald-500 text-stone-950 hover:bg-emerald-400 px-10 py-6 rounded-xl text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                Get Started Free in 30 Seconds
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-800/80 bg-stone-950 py-12 px-6 sm:px-8 text-stone-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-stone-300">BYOS Storage Engine</span>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()} BYOS Inc. All rights reserved.</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/docs" className="hover:text-stone-300 transition-colors">S3 API & SDK Docs</Link>
            <Link href="/login" className="hover:text-stone-300 transition-colors">Developer Portal</Link>
            <a href="#privacy" className="hover:text-stone-300 transition-colors">Privacy & OAuth Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
