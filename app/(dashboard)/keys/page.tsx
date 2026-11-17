"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Trash2,
  Copy,
  Check,
  Code,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  // Revealed Secret State
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showSecretModal, setShowSecretModal] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  useEffect(() => {
    fetchKeys();
    fetch("/api/v1/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.buckets) setBuckets(data.buckets);
      })
      .catch(() => { });
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/keys");
      if (res.ok) {
        const data = await res.json();
        setKeysList(data.keys || []);
      }
    } catch {
      // Gracefully handle
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
        setShowSecretModal(true);
        setNewKeyName("");
        setShowCreateModal(false);
        fetchKeys();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err?.error?.message || "Failed to create API key.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? Applications using this key will immediately lose access.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("API key revoked");
        fetchKeys();
      } else {
        toast.error("Error revoking key");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const activeKeys = keysList.filter((k) => !k.revokedAt);
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "/api/v1";

  return (
    <div className="space-y-8">
      {/* HEADING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold text-stone-100">API keys</h1>
          <p className="mt-1 text-sm text-stone-400">Generate and manage cryptographic credentials for programmatic S3 access.</p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Generate key
        </button>
      </div>

      {/* REVEALED BANNER (If modal was dismissed) */}
      {revealedSecret && !showSecretModal && (
        <div className="p-4 rounded-lg border border-stone-800 bg-stone-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-400 font-medium">Your API key is active</span>
            <button
              onClick={() => setRevealedSecret(null)}
              className="text-xs text-stone-400 hover:text-stone-100"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-stone-400">Copy this key now. It will not be shown again.</p>
          <div className="flex items-center justify-between gap-2 bg-stone-950 p-2.5 rounded-lg border border-stone-800">
            <code className="font-mono text-xs text-emerald-400 break-all select-all flex-1">
              {revealedSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(revealedSecret);
                setCopiedSecret(true);
                toast.success("Key copied");
                setTimeout(() => setCopiedSecret(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-3 py-1 rounded text-xs transition-colors shrink-0"
            >
              {copiedSecret ? <Check size={12} /> : <Copy size={12} />}
              {copiedSecret ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* KEYS TABLE */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full bg-stone-900 rounded-lg" />
          <Skeleton className="h-12 w-full bg-stone-900 rounded-lg" />
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="py-16 text-center text-sm text-stone-400 border border-stone-800 rounded-lg bg-stone-900/40">
          No active API keys found. Click <span className="text-emerald-400 font-medium">+ Generate key</span> above to create one.
        </div>
      ) : (
        <div className="border border-stone-800 rounded-lg overflow-hidden bg-stone-900/40">
          <div className="px-5 py-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-100">Active API Keys</h2>
            <span className="text-xs text-stone-400">{activeKeys.length} active</span>
          </div>

          <div className="divide-y divide-stone-800/60">
            {activeKeys.map((k) => (
              <div key={k.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <KeyRound size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium text-stone-100 flex items-center gap-2">
                      <span>{k.name}</span>
                      <span className="text-xs text-stone-400 font-mono">({k.scopes.join(", ")})</span>
                    </div>
                    <div className="text-xs text-stone-500 font-mono mt-0.5">Prefix: {k.keyPrefix}...</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeKey(k.id, k.name)}
                  className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW KEY DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-stone-900 border border-stone-800 text-stone-100 sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-stone-100">Generate API key</DialogTitle>
            <DialogDescription className="text-sm text-stone-400 mt-1">
              Create credentials for your applications to access BYOS.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm mb-2 text-stone-200">Key name</label>
              <input
                type="text"
                required
                placeholder="e.g. backend-service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-stone-200">Permissions (Scopes)</label>
              <div className="grid grid-cols-2 gap-2">
                {["read", "write", "list", "delete"].map((scope) => {
                  const checked = newKeyScopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-colors ${
                        checked
                          ? "bg-emerald-400/10 border-emerald-400/40 text-emerald-400"
                          : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      <span className="uppercase">{scope}</span>
                      <span>{checked ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-stone-200">Bucket restriction (optional)</label>
              <select
                value={newKeyBucket}
                onChange={(e) => setNewKeyBucket(e.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3 text-stone-100 focus:outline-none focus:border-emerald-400 text-sm cursor-pointer"
              >
                <option value="" className="bg-stone-900 text-stone-400">All buckets (unrestricted)</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id} className="bg-stone-900 text-stone-100">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2.5 rounded-lg text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                className="inline-flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {creating ? "Generating…" : "Generate key"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SECRET REVEAL DIALOG */}
      <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
        <DialogContent className="bg-stone-900 border border-stone-800 text-stone-100 sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-stone-100">Key generated</DialogTitle>
            <DialogDescription className="text-sm text-stone-400 mt-1">
              Copy this API key now. You will not be able to view it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs text-emerald-400 break-all select-all flex-1">
                  {revealedSecret}
                </code>
                <button
                  onClick={() => {
                    if (revealedSecret) {
                      navigator.clipboard.writeText(revealedSecret);
                      setCopiedSecret(true);
                      toast.success("Key copied");
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-3 py-1 rounded text-xs transition-colors shrink-0"
                >
                  {copiedSecret ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSecret ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Code Example</span>
              <div className="rounded-lg bg-stone-950 border border-stone-800 p-3 font-mono text-xs text-stone-300 overflow-x-auto">
                <pre>{`import { BYOSClient } from "byos-sdk";

const byos = new BYOSClient({
  apiKey: "${revealedSecret}",
  baseUrl: "${baseUrl}",
});`}</pre>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              onClick={() => setShowSecretModal(false)}
              className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
