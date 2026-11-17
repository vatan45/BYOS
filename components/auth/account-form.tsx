"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers } from "lucide-react";
export function AccountForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: signup ? "signup" : "login",
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reach the account service."
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xl font-semibold mb-12"
        >
          <Layers className="text-emerald-400" /> byos.
        </Link>
        <h1 className="text-3xl tracking-tight">
          {signup ? "Your next project starts here." : "Welcome back."}
        </h1>
        <p className="mt-3 mb-8 text-stone-400">
          {signup
            ? "Create your account. Connect Google Drive when you’re ready."
            : "Sign in to your storage workspace."}
        </p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm mb-2">
              Email
            </label>
            <input
              required
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-2">
              Password
            </label>
            <input
              required
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete={signup ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3"
            />
            {signup && (
              <p className="text-xs text-stone-400 mt-2">
                Use at least 8 characters.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-emerald-400 text-stone-950 rounded-lg p-3 font-medium disabled:opacity-50"
          >
            {loading ? "Please wait…" : signup ? "Create account" : "Sign in"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="text-sm text-stone-400 mt-7">
          {signup ? "Already have an account?" : "New to BYOS?"}{" "}
          <Link
            className="text-emerald-400"
            href={signup ? "/login" : "/signup"}
          >
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}
