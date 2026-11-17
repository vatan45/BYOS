"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Trash2,
  Copy,
  Check,
  Code,
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
      .catch(() => {});
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
      <div className="preview-heading">
        <div>
          <span className="muted">AUTHENTICATION & ACCESS</span>
          <h3>API keys</h3>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="preview-create"
        >
          + Generate key
        </button>
      </div>

      {/* REVEALED BANNER (If modal was dismissed) */}
      {revealedSecret && !showSecretModal && (
        <div className="p-4 rounded-lg border border-[#343a31] bg-[#111411] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#d8f99c] font-medium">Your API key is active</span>
            <button
              onClick={() => setRevealedSecret(null)}
              className="text-xs text-[#929a8d] hover:text-[#f0f2eb]"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-[#929a8d]">Copy this key now. It will not be shown again.</p>
          <div className="flex items-center justify-between gap-2 bg-[#0c0e0d] p-2 rounded border border-[#292d29]">
            <code className="font-mono text-xs text-[#d8f99c] break-all select-all flex-1">
              {revealedSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(revealedSecret);
                setCopiedSecret(true);
                toast.success("Key copied");
                setTimeout(() => setCopiedSecret(false), 2000);
              }}
              className="action small !py-1 !px-3 shrink-0"
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
          <Skeleton className="h-10 w-full bg-[#161a16] rounded" />
          <Skeleton className="h-10 w-full bg-[#161a16] rounded" />
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#929a8d] border border-[#292d29] rounded-lg bg-[#111411]">
          No active API keys. Click <span className="text-[#d8f99c] font-medium">+ Generate key</span> above to create one.
        </div>
      ) : (
        <div className="preview-table">
          <div>
            <span>NAME</span>
            <span>PREFIX</span>
            <span>ACTIONS</span>
          </div>
          {activeKeys.map((k) => (
            <div key={k.id}>
              <span>
                <KeyRound size={15} className="text-[#d8f99c]" />
                <span className="font-medium text-[#f0f2eb]">{k.name}</span>
                <span className="text-[10px] text-[#929a8d] font-mono ml-2">
                  ({k.scopes.join(", ")})
                </span>
              </span>
              <span className="font-mono text-xs text-[#929a8d]">
                {k.keyPrefix}...
              </span>
              <span>
                <button
                  onClick={() => handleRevokeKey(k.id, k.name)}
                  className="text-xs text-[#929a8d] hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={13} /> Revoke
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* NEW KEY DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#111411] border-[#292d29] text-[#f0f2eb] sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-[#f0f2eb]">Generate API key</DialogTitle>
            <DialogDescription className="text-xs text-[#929a8d]">
              Create credentials for your applications to access BYOS.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#929a8d]">Key name</Label>
              <Input
                type="text"
                required
                placeholder="e.g. backend-service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-[#0c0e0d] border-[#292d29] text-[#f0f2eb] font-mono text-sm focus-visible:ring-[#d8f99c] rounded"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#929a8d]">Scopes</Label>
              <div className="grid grid-cols-2 gap-2">
                {["read", "write", "list", "delete"].map((scope) => {
                  const checked = newKeyScopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`p-2 rounded border text-xs font-mono flex items-center justify-between transition-colors ${
                        checked
                          ? "bg-[#d8f99c15] border-[#d8f99c] text-[#d8f99c]"
                          : "bg-[#0c0e0d] border-[#292d29] text-[#929a8d] hover:text-[#f0f2eb]"
                      }`}
                    >
                      <span className="uppercase">{scope}</span>
                      <span>{checked ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#929a8d]">Bucket restriction (optional)</Label>
              <select
                value={newKeyBucket}
                onChange={(e) => setNewKeyBucket(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0c0e0d] border border-[#292d29] text-[#f0f2eb] font-mono text-xs focus:outline-none focus:border-[#d8f99c]"
              >
                <option value="">All buckets</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                className="text-xs text-[#929a8d] hover:text-[#f0f2eb]"
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                className="action small !py-2 !px-4"
              >
                {creating ? "Generating…" : "Generate key"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SECRET REVEAL DIALOG */}
      <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
        <DialogContent className="bg-[#111411] border-[#292d29] text-[#f0f2eb] sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-[#f0f2eb]">Key generated</DialogTitle>
            <DialogDescription className="text-xs text-[#929a8d]">
              Copy this API key now. You will not be able to view it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded bg-[#0c0e0d] border border-[#292d29] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs text-[#d8f99c] break-all select-all flex-1">
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
                  className="action small !py-1 !px-3 shrink-0"
                >
                  {copiedSecret ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSecret ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="muted">CODE EXAMPLE</span>
              <div className="rounded bg-[#0c0e0d] border border-[#292d29] p-3 font-mono text-[11px] text-[#929a8d] overflow-x-auto">
                <pre>{`import { BYOSClient } from "byos-sdk";

const byos = new BYOSClient({
  apiKey: "${revealedSecret}",
  baseUrl: "${baseUrl}",
});`}</pre>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setShowSecretModal(false)}
              className="text-xs bg-[#242a22] text-[#f0f2eb] hover:bg-[#2d342a] rounded px-4 py-1.5"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
