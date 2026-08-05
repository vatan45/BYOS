"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowRight, AlertCircle, Eye, EyeOff, Cloud, Database, Zap, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to establish secure session.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthErr) setError(oauthErr.message);
    } catch (err: any) {
      setError(err.message || "OAuth provider connection error.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 md:p-6 lg:p-8 font-sans antialiased">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container - Split Screen Card */}
      <div className="max-w-6xl w-full bg-slate-950/70 border border-white/[0.08] backdrop-blur-2xl rounded-[2.5rem] p-4 sm:p-6 md:p-8 lg:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Form Section */}
        <div className="lg:col-span-6 max-w-md w-full mx-auto py-4 sm:py-6 flex flex-col justify-between min-h-[540px]">
          <div className="space-y-8">
            
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                Welcome back!
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Simplify your workflow and boost productivity with <strong className="text-emerald-400">BYOS</strong>. Turn Google Drive into S3-compatible cloud storage.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <input
                  type="email"
                  required
                  placeholder="Email or Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 rounded-full bg-slate-900/90 border border-slate-700/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-6 pr-12 py-4 rounded-full bg-slate-900/90 border border-slate-700/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 transition-colors"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex justify-end pr-3">
                  <span className="text-xs text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors font-medium">
                    Forgot Password?
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-base flex items-center justify-center space-x-2 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all transform active:scale-[0.99]"
              >
                <span>{loading ? "Logging in..." : "Login"}</span>
                {!loading && <ArrowRight className="w-5 h-5 stroke-[2.5]" />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center pt-2">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0c1322] px-4 text-slate-400 font-medium">or continue with</span>
              </div>
            </div>

            {/* Social Circle Buttons */}
            <div className="flex justify-center items-center space-x-5">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                type="button"
                title="Continue with Google"
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-white hover:border-emerald-500/50 shadow-lg transition-all group"
              >
                <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.7 1.6 7.6l3.7 2.9C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.3C.6 9.3 0 10.8 0 12.5s.6 3.2 1.6 5.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.2-6.7-5.5L1.6 16.7C3.5 20.6 7.4 23.3 12 24z"
                  />
                </svg>
              </button>
              
              <button
                type="button"
                title="S3 Protocol Access"
                onClick={() => {}}
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-emerald-500/50 shadow-lg transition-all group"
              >
                <Cloud className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                type="button"
                title="Encrypted Vault"
                onClick={() => {}}
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-emerald-500/50 shadow-lg transition-all group"
              >
                <Lock className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Footer Link */}
          <div className="text-center text-sm text-slate-400 pt-8">
            Not a member?{" "}
            <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Register now
            </Link>
          </div>
        </div>

        {/* Right Column: Visual Feature Panel (Inspired by reference illustration & cards) */}
        <div className="lg:col-span-6 hidden lg:flex flex-col justify-between h-[620px] w-full bg-gradient-to-br from-[#0d1c26] via-[#0a1520] to-[#0c1f18] border border-emerald-500/20 rounded-[2.2rem] p-10 relative overflow-hidden shadow-inner">
          
          {/* Decorative background vectors */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Top Floating Badge 1 (Top Left) */}
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-emerald-500/30 shadow-lg transform hover:-translate-y-1 transition-transform">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              </div>
              <div className="text-xs font-mono text-slate-300">
                <span className="text-white font-bold">$0 Markup</span> on storage
              </div>
            </div>

            {/* Top Floating Badge 2 (Top Right) */}
            <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-emerald-500/30 flex items-center justify-center shadow-lg transform translate-y-6 hover:scale-110 transition-transform">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Central Illustration Area with Floating Cards */}
          <div className="relative my-auto flex flex-col items-center justify-center w-full z-10 py-6">
            
            {/* Central Glowing Shield / Server Node */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse blur-2xl" />
              <div className="absolute inset-2 rounded-full border border-emerald-500/40 border-dashed animate-[spin_25s_linear_infinite]" />
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-slate-900 border border-emerald-500/50 backdrop-blur-xl flex flex-col items-center justify-center p-4 shadow-[0_0_35px_rgba(16,185,129,0.25)] transform hover:scale-105 transition-transform">
                <Shield className="w-14 h-14 text-emerald-400 fill-emerald-400/20 mb-1" />
                <span className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase font-bold">Zero Trust</span>
              </div>
            </div>

            {/* Floating Metric Card (Left - Inspired by the reference card with gauge) */}
            <div className="absolute -left-2 bottom-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl max-w-[220px] w-full transform -rotate-2 hover:rotate-0 transition-transform">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">Google Drive S3</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">5.2 GB Streamed</p>
                </div>
                {/* Circular Gauge */}
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-400"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray="100, 100"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-emerald-300 font-mono">100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
                  Active Sync
                </span>
                <span className="text-[10px] text-slate-500 font-mono">drive.file</span>
              </div>
            </div>

            {/* Right Floating Mini Node */}
            <div className="absolute right-2 bottom-16 bg-slate-900/90 border border-white/10 p-3 rounded-2xl shadow-xl flex items-center space-x-3 transform rotate-3 hover:rotate-0 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold font-mono">
                S3
              </div>
              <div className="pr-2">
                <div className="text-xs font-bold text-slate-200">API v1.0</div>
                <div className="text-[10px] text-slate-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" /> S3 Compatible
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Caption and Carousel Dots */}
          <div className="relative z-10 space-y-4 text-center mt-auto pt-4">
            <div className="flex justify-center items-center space-x-2">
              <span className="w-6 h-1.5 rounded-full bg-emerald-500" />
              <span className="w-2 h-1.5 rounded-full bg-slate-700" />
              <span className="w-2 h-1.5 rounded-full bg-slate-700" />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              Make cloud storage effortless and unlimited with <span className="text-emerald-400">BYOS</span>
            </h3>
          </div>

        </div>

      </div>
    </div>
  );
}
