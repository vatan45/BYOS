"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Code,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
      // Gracefully handle error
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
  const revokedKeys = keysList.filter((k) => k.revokedAt);

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "/api/v1";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center space-x-2.5">
            <KeyRound className="w-6 h-6 text-emerald-400" />
            <span>API keys</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Programmatic access tokens for the TypeScript SDK and HTTP API.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          New key
        </Button>
      </div>

      {/* ONE-TIME REVEAL BANNER (If modal was closed) */}
      {revealedSecret && !showSecretModal && (
        <Card className="p-5 bg-stone-900/60 border border-emerald-500/40 rounded-xl space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white">Your new API key</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Copy this key now. It will not be shown again.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealedSecret(null)}
              className="h-7 px-2.5 text-stone-400 hover:text-stone-200 text-xs"
            >
              Dismiss
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 bg-[#0c0e0d] p-2.5 rounded-lg border border-stone-800">
            <code className="flex-1 font-mono text-emerald-300 text-xs md:text-sm break-all select-all px-2">
              {revealedSecret}
            </code>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(revealedSecret);
                setCopiedSecret(true);
                toast.success("API key copied");
                setTimeout(() => setCopiedSecret(false), 2000);
              }}
              className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-1.5 rounded-lg text-xs"
            >
              {copiedSecret ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copiedSecret ? "Copied" : "Copy key"}
            </Button>
          </div>
        </Card>
      )}

      {/* ACTIVE KEYS TABLE */}
      <Card className="bg-stone-900/40 border-stone-800/80 rounded-xl overflow-hidden">
        <CardHeader className="p-5 bg-stone-900/60 border-b border-stone-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 space-y-0">
          <div className="flex items-center space-x-2">
            <CardTitle className="font-medium text-white text-sm">Active keys</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono bg-stone-800 text-stone-300 border-stone-700">
              {activeKeys.length}
            </Badge>
          </div>
          <button
            onClick={() => setShowSecurityModal(true)}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            How keys are secured &rarr;
          </button>
        </CardHeader>

        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full bg-stone-900 rounded-lg" />
            <Skeleton className="h-10 w-full bg-stone-900 rounded-lg" />
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs space-y-3">
            <p>No active API keys yet.</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium text-xs px-3.5 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create your first key
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#0c0e0d]">
              <TableRow className="border-stone-800/80 hover:bg-transparent">
                <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Name</TableHead>
                <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Key Prefix</TableHead>
                <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Scopes</TableHead>
                <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Bucket</TableHead>
                <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium">Created</TableHead>
                <TableHead className="py-3 px-5 text-xs text-stone-400 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-800/60 text-xs">
              {activeKeys.map((k) => (
                <TableRow key={k.id} className="hover:bg-stone-900/40 transition-colors border-stone-800/60">
                  <TableCell className="py-3 px-5 font-medium text-white">{k.name}</TableCell>
                  <TableCell className="py-3 px-5 font-mono text-stone-300">{k.keyPrefix}...</TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-stone-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-stone-400 font-mono">
                    {k.bucketRestriction || "All buckets"}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-stone-400 font-mono">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeKey(k.id, k.name)}
                      className="text-stone-400 hover:text-rose-400 text-xs h-7 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* REVOKED KEYS TABLE */}
      {revokedKeys.length > 0 && (
        <Card className="bg-stone-900/30 border-stone-800/60 rounded-xl overflow-hidden">
          <CardHeader className="p-4 bg-stone-900/40 border-b border-stone-800/60">
            <CardTitle className="font-medium text-stone-400 text-xs">Revoked keys</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-[#0c0e0d]">
              <TableRow className="border-stone-800/60">
                <TableHead className="py-2.5 px-5 text-xs text-stone-500 font-medium">Name</TableHead>
                <TableHead className="py-2.5 px-5 text-xs text-stone-500 font-medium">Key Prefix</TableHead>
                <TableHead className="py-2.5 px-5 text-xs text-stone-500 font-medium">Revoked Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-800/40 text-xs">
              {revokedKeys.map((k) => (
                <TableRow key={k.id} className="text-stone-500 border-stone-800/40">
                  <TableCell className="py-2.5 px-5 line-through">{k.name}</TableCell>
                  <TableCell className="py-2.5 px-5 font-mono">{k.keyPrefix}...</TableCell>
                  <TableCell className="py-2.5 px-5 font-mono">
                    {k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* SECURITY EXPLANATION MODAL */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="bg-[#0c0e0d] border-stone-800 text-stone-100 sm:max-w-md rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">API key security</DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              How BYOS handles and stores your programmatic credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs text-stone-300 leading-relaxed pt-2">
            <p>
              When an API key is generated, the full token is provided to you exactly once.
            </p>
            <p>
              Before saving to the database, the token is securely hashed with bcrypt. The plaintext key is never stored on our servers.
            </p>
            <p>
              The masked prefix (e.g. <code className="text-emerald-400 font-mono">byos_live_...</code>) is displayed only to help you distinguish between keys. If you lose a key, revoke it and generate a replacement.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={() => setShowSecurityModal(false)} className="bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs px-4">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW SECRET KEY MODAL */}
      <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
        <DialogContent className="bg-[#0c0e0d] border-stone-800 text-stone-100 sm:max-w-lg rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">API key generated</DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="p-3.5 rounded-lg bg-stone-900 border border-stone-800 space-y-2">
              <Label className="text-[10px] font-mono uppercase text-stone-400 font-medium">
                Secret Token
              </Label>
              <div className="flex items-center justify-between gap-2 bg-[#0c0e0d] p-2.5 rounded-lg border border-stone-800">
                <code className="font-mono text-emerald-300 text-xs font-medium break-all select-all">
                  {revealedSecret}
                </code>
                <Button
                  onClick={() => {
                    if (revealedSecret) {
                      navigator.clipboard.writeText(revealedSecret);
                      setCopiedSecret(true);
                      toast.success("API key copied");
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }
                  }}
                  className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-3.5 py-1.5 rounded-lg text-xs shrink-0"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copiedSecret ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Quickstart snippet */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase text-stone-400 font-medium flex items-center space-x-1.5">
                <Code className="w-3 h-3 text-stone-400" />
                <span>Example usage</span>
              </Label>
              <div className="rounded-lg bg-stone-900 border border-stone-800 p-3 font-mono text-[11px] text-stone-300 overflow-x-auto leading-relaxed">
                <pre>{`import { BYOSClient } from "byos-sdk";

const byos = new BYOSClient({
  apiKey: "${revealedSecret}",
  baseUrl: "${baseUrl}",
});

await byos.upload("app-assets", "example.txt", buffer);`}</pre>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setShowSecretModal(false)}
              className="bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs px-4"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE API KEY DIALOG */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#0c0e0d] border-stone-800 text-stone-100 sm:max-w-md rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">New API key</DialogTitle>
            <DialogDescription className="text-xs text-stone-400">Configure scopes and bucket restrictions.</DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-300">
                Key name
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. backend-service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-stone-900 border-stone-800 text-white font-mono text-sm focus-visible:ring-emerald-400 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-stone-300">
                Scopes
              </Label>
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
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                          : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
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
              <Label className="text-xs text-stone-300">
                Bucket restriction (optional)
              </Label>
              <select
                value={newKeyBucket}
                onChange={(e) => setNewKeyBucket(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
              >
                <option value="" className="bg-stone-900 text-stone-300">All buckets</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id} className="bg-stone-900 text-white">
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
                className="rounded-lg text-stone-400 hover:text-stone-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium rounded-lg px-4 text-xs"
              >
                {creating ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
