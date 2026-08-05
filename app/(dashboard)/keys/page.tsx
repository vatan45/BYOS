"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Lock,
  Terminal,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Code,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ApiKeyItem {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  bucketRestriction: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export default function ApiKeysPage() {
  const [keysList, setKeysList] = useState<ApiKeyItem[]>([]);
  const [buckets, setBuckets] = useState<Array<{ name: string; id: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Key state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read", "write", "list", "delete"]);
  const [newKeyBucket, setNewKeyBucket] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Revealed Secret & Modal State
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showSecretModal, setShowSecretModal] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  useEffect(() => {
    fetchKeys();
    fetch("/api/v1/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.buckets) setBuckets(data.buckets);
      });
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/keys");
      if (res.ok) {
        const data = await res.json();
        setKeysList(data.keys || []);
      }
    } catch (e) {
      console.error("Error fetching keys list:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || newKeyScopes.length === 0) return;
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          bucketId: newKeyBucket ? newKeyBucket : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const genKey = data.key || data.apiKey;
        setRevealedSecret(genKey);
        setShowSecretModal(true); // Pop open the dedicated full-key modal!
        setNewKeyName("");
        setShowCreateModal(false);
        fetchKeys();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err?.error?.message || "Failed to provision API key.");
      }
    } catch {
      setCreateError("Network error occurred during key generation.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Revoke API Key '${name}'? All applications using this key will immediately lose Drive access.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("API key revoked successfully.");
        fetchKeys();
      } else {
        toast.error("Error revoking authorization key.");
      }
    } catch {
      toast.error("Network exception while communicating with auth engine.");
    }
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const activeKeys = keysList.filter((k) => !k.revokedAt);
  const revokedKeys = keysList.filter((k) => k.revokedAt);

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "https://byos-three.vercel.app/api/v1";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Key className="w-7 h-7 text-cyan-400" />
            <span>API Secret Keys & Authorization</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Generate programmatic access tokens for <code className="text-emerald-400 font-mono">byos-sdk</code> or S3 client libraries.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-xl px-5 py-2.5"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" />
          Generate Secret Key
        </Button>
      </div>

      {/* ONE-TIME REVEAL PERSISTENT BANNER (In case modal was closed) */}
      {revealedSecret && !showSecretModal && (
        <Card className="p-6 bg-stone-900 border-2 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)] space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span className="text-lg text-white">Your Complete Secret Key is Currently Active</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealedSecret(null)}
              className="h-8 px-3 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs font-mono"
            >
              Hide Banner &times;
            </Button>
          </div>

          <p className="text-xs text-stone-300 font-sans leading-relaxed">
            ⚠️ <strong className="text-amber-400">Copy this full token right now!</strong> For Zero-Trust security compliance, BYOS stores keys as irreversible Bcrypt hashes in PostgreSQL. Once you refresh or navigate away from this screen, only the masked prefix (<code className="text-emerald-400 font-mono">{revealedSecret.slice(0, 18)}...</code>) will appear in your table below!
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
            <code className="flex-1 font-mono text-emerald-300 text-sm md:text-base break-all select-all font-bold px-2">
              {revealedSecret}
            </code>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(revealedSecret);
                setCopiedSecret(true);
                toast.success("Secret key copied to clipboard!");
                setTimeout(() => setCopiedSecret(false), 3000);
              }}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold px-6 py-5 rounded-xl text-xs uppercase tracking-wider shrink-0 shadow-md"
            >
              {copiedSecret ? <Check className="w-4 h-4 mr-2 stroke-[3]" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedSecret ? "Copied!" : "Copy Full Key"}
            </Button>
          </div>
        </Card>
      )}

      {/* ACTIVE AUTHORIZED KEYS TABLE */}
      <Card className="bg-stone-900/60 border-stone-800 overflow-hidden shadow-sm">
        <CardHeader className="p-6 bg-stone-900/80 border-b border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 space-y-0">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <CardTitle className="font-extrabold text-white text-base">Active Authorized Keys</CardTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {activeKeys.length} Active
            </Badge>
          </div>
          <button
            onClick={() => setShowSecurityModal(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1.5 underline decoration-dotted transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Why are my stored keys masked with (...)? 🔒</span>
          </button>
        </CardHeader>

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full bg-stone-900 rounded-xl" />
            <Skeleton className="h-12 w-full bg-stone-900 rounded-xl" />
            <Skeleton className="h-12 w-full bg-stone-900 rounded-xl" />
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="py-16 text-center text-stone-400 font-mono text-xs space-y-3">
            <p>No active API keys provisioned yet.</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs px-4 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Generate Your First Token
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-stone-950/80">
              <TableRow className="border-stone-800 hover:bg-transparent">
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Token Name & Masked Prefix</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Authorized Scopes</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Bucket Restriction</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold">Created Date</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-stone-400 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-800 text-sm">
              {activeKeys.map((k) => (
                <TableRow key={k.id} className="hover:bg-stone-800/50 transition-colors border-stone-800">
                  <TableCell className="py-4 px-6">
                    <div className="font-extrabold text-white font-sans text-base">{k.name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs text-cyan-300 font-mono bg-stone-950 border-stone-800 font-bold">
                        {k.keyPrefix}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] uppercase font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6 font-mono text-xs text-stone-400">
                    {k.bucketRestriction ? (
                      <span className="text-amber-400 font-bold">🔒 Restricted Bucket</span>
                    ) : (
                      <span className="text-stone-400">🌐 Global Drive Access</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6 font-mono text-stone-400 text-xs">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSecurityModal(true)}
                        title="Click to learn why stored tokens cannot be viewed in plaintext"
                        className="text-xs text-stone-400 hover:text-cyan-300 font-mono border border-stone-800 bg-stone-950 hover:bg-stone-900"
                      >
                        <Lock className="w-3 h-3 mr-1.5 text-stone-500" />
                        Why Masked?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeKey(k.id, k.name)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Revoke
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* REVOKED KEYS SECTION */}
      {revokedKeys.length > 0 && (
        <Card className="bg-stone-900/30 border-stone-800/80 opacity-75 overflow-hidden">
          <CardHeader className="p-5 bg-stone-950/60 border-b border-stone-800 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-mono uppercase font-bold text-stone-400">Revoked Security Keys Audit Log</CardTitle>
            <span className="text-[11px] text-stone-500 font-mono">{revokedKeys.length} Revoked</span>
          </CardHeader>
          <CardContent className="p-4 space-y-2 font-mono text-xs text-stone-500">
            {revokedKeys.map((rk) => (
              <div key={rk.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-950/80 border border-stone-800/60">
                <div>
                  <span className="line-through text-stone-400 font-bold mr-2">{rk.name}</span>
                  <span>{rk.keyPrefix}</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-rose-500 uppercase font-mono bg-rose-500/5 border-rose-500/20">
                  Revoked on {new Date(rk.revokedAt!).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DEDICATED NEW SECRET KEY REVEAL DIALOG */}
      <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
        <DialogContent className="bg-stone-950 border-2 border-emerald-500 text-stone-100 sm:max-w-xl rounded-3xl p-8 shadow-[0_0_60px_rgba(16,185,129,0.25)]">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white font-sans">Secret API Key Minted!</DialogTitle>
                <DialogDescription className="text-xs text-emerald-300 font-mono">
                  Your full token is ready. Copy it now before closing this modal!
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
              <Label className="text-[11px] font-mono uppercase text-stone-400 font-bold flex items-center justify-between">
                <span>Complete API Secret Token</span>
                <span className="text-amber-400">Never shown again after close</span>
              </Label>
              <div className="flex items-center justify-between gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
                <code className="font-mono text-emerald-300 text-sm font-bold break-all select-all">
                  {revealedSecret}
                </code>
                <Button
                  onClick={() => {
                    if (revealedSecret) {
                      navigator.clipboard.writeText(revealedSecret);
                      setCopiedSecret(true);
                      toast.success("Secret key copied to clipboard!");
                      setTimeout(() => setCopiedSecret(false), 3000);
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold px-5 py-4 rounded-xl text-xs uppercase shrink-0 shadow-md transition-all"
                >
                  {copiedSecret ? <Check className="w-4 h-4 mr-1.5 stroke-[3]" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiedSecret ? "Copied!" : "Copy Full Key"}
                </Button>
              </div>
            </div>

            {/* Quickstart snippet with actual key */}
            <div className="space-y-2">
              <Label className="text-[11px] font-mono uppercase text-stone-400 font-bold flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick-Start: Use in your product codebase right now</span>
              </Label>
              <div className="rounded-2xl bg-stone-900/90 border border-stone-800 p-4 font-mono text-xs text-stone-300 overflow-x-auto leading-relaxed">
                <pre>{`import BYOSClient from "byos-sdk";

const byos = new BYOSClient({
  apiKey: "${revealedSecret}",
  endpoint: "${baseUrl}"
});

// Stream directly to your Google Drive!
const res = await byos.upload("default", "test.txt", Buffer.from("Hello BYOS"));
console.log("Uploaded object ETag:", res.etag);`}</pre>
              </div>
            </div>

            <div className="text-xs text-stone-400 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-300">Why won&apos;t I see this full key again?</div>
                <div className="text-stone-300 leading-relaxed text-[11px]">
                  Once you close this dialog, BYOS saves only a mathematical Bcrypt hash and the masked prefix (<code className="text-white font-mono">{revealedSecret?.slice(0, 18)}...</code>) in PostgreSQL. If you lose this key later, simply click Revoke and generate a fresh replacement token!
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-stone-800">
            <Button
              onClick={() => setShowSecretModal(false)}
              className="w-full py-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.3)]"
            >
              I have copied my secret key &mdash; Continue to Console
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WHY MASKED EXPLANATION MODAL */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Lock className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-white">Why is my API key shown as `byos_live_xxx...`?</DialogTitle>
                <DialogDescription className="text-xs text-stone-400">Zero-Trust Cryptographic Architecture</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm text-stone-300 font-sans leading-relaxed">
            <p>
              When you see an API key displayed as <code className="text-emerald-400 bg-stone-900 px-2 py-1 rounded font-mono font-bold">byos_live_ViI9vCUb...</code> in your dashboard table, this is <strong className="text-white font-bold">by design for production cybersecurity compliance</strong> (matching standards set by Stripe, AWS, and OpenAI).
            </p>
            <div className="space-y-2 bg-stone-900 p-4 rounded-xl border border-stone-800 text-xs">
              <div className="font-bold text-cyan-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4" />
                <span>How your keys are secured:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-300">
                <li>When first generated, BYOS hands you the complete plaintext 48-character secret token exactly once.</li>
                <li>Before saving to PostgreSQL, an irreversible one-way <strong className="text-emerald-400">Bcrypt algorithm hash</strong> is applied. The plaintext key is never stored anywhere on our servers.</li>
                <li>The prefix (<code className="text-cyan-300">byos_live_ViI9...</code>) is kept solely so you can identify which key is which in your production applications!</li>
              </ul>
            </div>
            <p className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              💡 <strong className="font-bold">Need your full key for testing right now?</strong> If you forgot to copy the complete token when you created it, simply click <strong className="text-rose-400 underline">Revoke</strong> in the table and click <strong className="text-cyan-400 underline">Generate Secret Key</strong> above to immediately mint a brand new token!
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSecurityModal(false)} className="bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl px-6">
              Got it! &times;
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE API KEY SHADCN DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Key className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-white">Generate API Secret Token</DialogTitle>
                <DialogDescription className="text-xs text-stone-400">Configure authorization scopes & bucket restrictions</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              ⚠️ {createError}
            </div>
          )}

          <form onSubmit={handleCreateKey} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Token Friendly Name
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g., Prod Web-App Backend"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-stone-900 border-stone-800 text-white font-mono text-sm focus-visible:ring-cyan-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Authorized Operations Scopes
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                {["read", "write", "list", "delete"].map((scope) => {
                  const checked = newKeyScopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer ${
                        checked
                          ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                          : "bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      <span className="uppercase">{scope}</span>
                      <span>{checked ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Restrict to Specific Bucket (Optional)
              </Label>
              <select
                value={newKeyBucket}
                onChange={(e) => setNewKeyBucket(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="" className="bg-stone-900 text-stone-300">🌐 Global Access (All Buckets)</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id} className="bg-stone-900 text-white">
                    Bucket: {b.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="rounded-xl text-stone-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                className="bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-extrabold rounded-xl px-5 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {creating ? "Generating Token..." : "Provision Token"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
