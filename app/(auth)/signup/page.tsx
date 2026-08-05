"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowRight, CheckCircle, AlertCircle, Eye, EyeOff, Cloud, Lock, Zap, Server } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long for secure encryption.");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data?.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccessMsg("Account registration complete! If verification is required, please check your email inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete account registration.");
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
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container - Split Screen Card */}
      <div className="max-w-6xl w-full bg-slate-950/70 border border-white/[0.08] backdrop-blur-2xl rounded-[2.5rem] p-4 sm:p-6 md:p-8 lg:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Form Section */}
        <div className="lg:col-span-6 max-w-md w-full mx-auto py-4 sm:py-6 flex flex-col justify-between min-h-[560px]">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono tracking-wider mb-2">
                <Lock className="w-3 h-3" />
                <span>ZERO-TRUST ARCHITECTURE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                Create Account
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Deploy S3-compatible cloud storage backed directly by your Google Drive storage with <strong className="text-cyan-400">BYOS</strong>.
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  placeholder="Email Address (you@company.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 rounded-full bg-slate-900/90 border border-slate-700/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Master Password (min. 8 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-6 pr-12 py-4 rounded-full bg-slate-900/90 border border-slate-700/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 transition-colors"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Security Guarantees Box */}
              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-3.5 rounded-2xl border border-white/[0.04]">
                <div className="font-semibold text-slate-300">🔐 Security Guarantees:</div>
                <div>• OAuth access strictly restricted to isolated <code className="text-cyan-300">drive.file</code> folder scope.</div>
                <div>• API Keys stored exclusively as mathematical Bcrypt hashes.</div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-base flex items-center justify-center space-x-2 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all transform active:scale-[0.99]"
              >
                <span>{loading ? "Creating Account..." : "Register"}</span>
                {!loading && <ArrowRight className="w-5 h-5 stroke-[2.5]" />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative pt-1">
              <div className="absolute inset-0 flex items-center pt-1">
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
                title="Sign up with Google"
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-white hover:border-cyan-500/50 shadow-lg transition-all group"
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
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-500/50 shadow-lg transition-all group"
              >
                <Cloud className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                type="button"
                title="Encrypted Vault"
                onClick={() => {}}
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-500/50 shadow-lg transition-all group"
              >
                <Server className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Footer Link */}
          <div className="text-center text-sm text-slate-400 pt-6">
            Already registered?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Sign in to Console
            </Link>
          </div>
        </div>

        {/* Right Column: Visual Feature Panel (Cyan Twin Design) */}
        <div className="lg:col-span-6 hidden lg:flex flex-col justify-between h-[640px] w-full bg-gradient-to-br from-[#0a1824] via-[#08121c] to-[#0a1f26] border border-cyan-500/20 rounded-[2.2rem] p-10 relative overflow-hidden shadow-inner">
          
          {/* Decorative background vectors */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Top Floating Badges */}
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-cyan-500/30 shadow-lg transform hover:-translate-y-1 transition-transform">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              </div>
              <div className="text-xs font-mono text-slate-300">
                <span className="text-white font-bold">Infinite</span> Scaling
              </div>
            </div>

            <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center shadow-lg transform translate-y-6 hover:scale-110 transition-transform">
              <Cloud className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          {/* Central Illustration Area with Floating Cards */}
          <div className="relative my-auto flex flex-col items-center justify-center w-full z-10 py-6">
            
            {/* Central Glowing Shield / Server Node */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-pulse blur-2xl" />
              <div className="absolute inset-2 rounded-full border border-cyan-500/40 border-dashed animate-[spin_25s_linear_infinite]" />
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-slate-900 border border-cyan-500/50 backdrop-blur-xl flex flex-col items-center justify-center p-4 shadow-[0_0_35px_rgba(6,182,212,0.25)] transform hover:scale-105 transition-transform">
                <Server className="w-14 h-14 text-cyan-400 mb-1" />
                <span className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-bold">Edge API</span>
              </div>
            </div>

            {/* Floating Metric Card (Left - Inspired by reference card with gauge) */}
            <div className="absolute -left-2 bottom-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl max-w-[220px] w-full transform -rotate-2 hover:rotate-0 transition-transform">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">S3 API Compatibility</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Drop-in Replacement</p>
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
                      className="text-cyan-400"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray="100, 100"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-cyan-300 font-mono">100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300">
                  Zero Runtime Dep
                </span>
                <span className="text-[10px] text-slate-500 font-mono">byos-sdk</span>
              </div>
            </div>

            {/* Right Floating Mini Node */}
            <div className="absolute right-2 bottom-16 bg-slate-900/90 border border-white/10 p-3 rounded-2xl shadow-xl flex items-center space-x-3 transform rotate-3 hover:rotate-0 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
                $0
              </div>
              <div className="pr-2">
                <div className="text-xs font-bold text-slate-200">Bandwidth Cost</div>
                <div className="text-[10px] text-cyan-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5" /> Direct Sync
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Caption and Carousel Dots */}
          <div className="relative z-10 space-y-4 text-center mt-auto pt-4">
            <div className="flex justify-center items-center space-x-2">
              <span className="w-6 h-1.5 rounded-full bg-cyan-500" />
              <span className="w-2 h-1.5 rounded-full bg-slate-700" />
              <span className="w-2 h-1.5 rounded-full bg-slate-700" />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              Transform Google Drive into enterprise object storage with <span className="text-cyan-400">BYOS</span>
            </h3>
          </div>

        </div>

      </div>
    </div>
  );
}
