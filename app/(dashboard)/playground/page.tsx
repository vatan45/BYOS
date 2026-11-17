"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Terminal,
  Server,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Play,
  FileText,
  Code,
  Layers,
  Database,
  ShieldCheck,
  HardDrive,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BucketInfo {
  id: string;
  name: string;
  providerFolderId: string;
  objectCount: number;
}

interface ObjectItem {
  Key: string;
  Size: number;
  ETag?: string;
  LastModified?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  latencyMs: number;
  requestPayload?: string;
  responsePayload?: string;
  curlCommand: string;
}

export default function S3PlaygroundPage() {
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionEmail, setConnectionEmail] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");

  // New bucket dialog
  const [showNewBucketDialog, setShowNewBucketDialog] = useState<boolean>(false);
  const [newBucketName, setNewBucketName] = useState<string>("");
  const [creatingBucket, setCreatingBucket] = useState<boolean>(false);

  // Playground operations state
  const [activeTab, setActiveTab] = useState<string>("upload");
  
  // Tab 1: Upload state
  const [uploadKey, setUploadKey] = useState<string>("test-folder/sample-config.json");
  const [uploadMode, setUploadMode] = useState<"text" | "file">("text");
  const [textPayload, setTextPayload] = useState<string>(
    JSON.stringify({ project: "BYOS S3 Engine", version: "1.0.0", status: "Active", timestamp: Date.now() }, null, 2)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [executingUpload, setExecutingUpload] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2: List & Read state
  const [objectList, setObjectList] = useState<ObjectItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [selectedObjKey, setSelectedObjKey] = useState<string>("");
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);

  // Tab 3: Edit / Overwrite state
  const [editKey, setEditKey] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [executingEdit, setExecutingEdit] = useState<boolean>(false);

  // Tab 4: Presigned URLs & Delete
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [executingSign, setExecutingSign] = useState<boolean>(false);
  const [executingDelete, setExecutingDelete] = useState<boolean>(false);

  // Telemetry Console Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchEnvironment();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      refreshObjectList(selectedBucket);
    }
  }, [selectedBucket]);

  const addLog = (log: Omit<LogEntry, "id" | "timestamp">) => {
    const newLog: LogEntry = {
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const fetchEnvironment = async () => {
    setLoadingOverview(true);
    try {
      const startTime = performance.now();
      const res = await fetch("/api/v1/dashboard/overview");
      const elapsed = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        setIsConnected(!!data?.connection?.connected);
        setConnectionEmail(data?.connection?.email || null);
        const bList = data?.buckets || [];
        setBuckets(bList);
        if (bList.length > 0 && !selectedBucket) {
          setSelectedBucket(bList[0].name);
        }
        addLog({
          method: "GET",
          url: "/api/v1/dashboard/overview",
          status: res.status,
          latencyMs: elapsed,
          responsePayload: JSON.stringify({ connected: data?.connection?.connected, bucketsCount: bList.length }, null, 2),
          curlCommand: `curl -X GET "${window.location.origin}/api/v1/dashboard/overview" -H "Cookie: dashboard-session=..."`,
        });
      }
    } catch (e) {
      console.error("Failed to load environment:", e);
    } finally {
      setLoadingOverview(false);
    }
  };

  const refreshObjectList = async (bucketName: string) => {
    if (!bucketName) return;
    setLoadingList(true);
    const startTime = performance.now();
    try {
      const res = await fetch(`/api/v1/buckets/${encodeURIComponent(bucketName)}/objects?limit=50`);
      const elapsed = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        const list = data.Contents || [];
        setObjectList(list);
        if (list.length > 0 && !selectedObjKey) {
          setSelectedObjKey(list[0].Key);
          setEditKey(list[0].Key);
        }
        addLog({
          method: "GET",
          url: `/api/v1/buckets/${bucketName}/objects?limit=50`,
          status: res.status,
          latencyMs: elapsed,
          responsePayload: JSON.stringify({ count: list.length, objects: list.map((o: any) => o.Key) }, null, 2),
          curlCommand: `curl -X GET "${window.location.origin}/api/v1/buckets/${bucketName}/objects" -H "Authorization: Bearer byos_live_YOUR_KEY"`,
        });
      } else {
        setObjectList([]);
      }
    } catch (e) {
      console.error("List objects error:", e);
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    setCreatingBucket(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/v1/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBucketName.trim().toLowerCase() }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      if (res.ok) {
        toast.success("Test storage bucket created inside Google Drive!");
        setNewBucketName("");
        setShowNewBucketDialog(false);
        fetchEnvironment();
      } else {
        const err = await res.json();
        toast.error(err?.error?.message || "Failed to create bucket.");
      }
    } catch {
      toast.error("Network error provisioning bucket.");
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleExecuteUpload = async () => {
    if (!selectedBucket || !uploadKey.trim()) {
      toast.error("Please provide a valid bucket and object key name.");
      return;
    }
    setExecutingUpload(true);
    const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(uploadKey.trim())}`;
    const startTime = performance.now();

    try {
      let body: BodyInit;
      let contentType = "application/json";

      if (uploadMode === "file" && selectedFile) {
        body = await selectedFile.arrayBuffer();
        contentType = selectedFile.type || "application/octet-stream";
      } else {
        body = textPayload;
        if (uploadKey.endsWith(".txt")) contentType = "text/plain";
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
      });

      const elapsed = Math.round(performance.now() - startTime);
      const data = await res.json().catch(() => ({}));

      addLog({
        method: "PUT",
        url,
        status: res.status,
        latencyMs: elapsed,
        requestPayload: uploadMode === "text" ? textPayload : `[Binary stream of ${selectedFile?.name}, ${selectedFile?.size} bytes]`,
        responsePayload: JSON.stringify(data, null, 2),
        curlCommand: `curl -X PUT "${window.location.origin}${url}" \\
  -H "Authorization: Bearer byos_live_YOUR_KEY" \\
  -H "Content-Type: ${contentType}" \\
  --data "${uploadMode === "text" ? textPayload.replace(/"/g, '\\"') : "@file_binary"}"`,
      });

      if (res.ok) {
        toast.success(`Object '${uploadKey}' successfully uploaded to Google Drive! (ETag: ${data.etag})`);
        refreshObjectList(selectedBucket);
        setSelectedObjKey(uploadKey);
        setEditKey(uploadKey);
      } else {
        toast.error(`Upload failed: ${data?.error?.message || res.statusText}`);
      }
    } catch {
      toast.error("Network exception during file transfer.");
    } finally {
      setExecutingUpload(false);
    }
  };

  const handleReadContent = async (key: string) => {
    if (!selectedBucket || !key) return;
    setLoadingContent(true);
    setViewingContent(null);
    const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(key)}`;
    const startTime = performance.now();

    try {
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - startTime);

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("json") || contentType.includes("text") || contentType.includes("javascript") || key.endsWith(".md")) {
          const txt = await res.text();
          setViewingContent(txt);
          setEditContent(txt);
          addLog({
            method: "GET",
            url,
            status: res.status,
            latencyMs: elapsed,
            responsePayload: txt.slice(0, 500) + (txt.length > 500 ? "... [truncated]" : ""),
            curlCommand: `curl -X GET "${window.location.origin}${url}" -H "Authorization: Bearer byos_live_YOUR_KEY"`,
          });
          toast.success("Object contents fetched from Drive!");
        } else {
          setViewingContent(`[Binary Object: ${contentType} - Click Download below to stream to disk]`);
          toast.info("Selected object is a binary asset.");
        }
      } else {
        toast.error("Failed to retrieve object content.");
      }
    } catch {
      toast.error("Error reading file stream.");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleExecuteEdit = async () => {
    if (!selectedBucket || !editKey.trim()) return;
    setExecutingEdit(true);
    const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(editKey.trim())}`;
    const startTime = performance.now();

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: editContent,
      });
      const elapsed = Math.round(performance.now() - startTime);
      const data = await res.json().catch(() => ({}));

      addLog({
        method: "PUT",
        url,
        status: res.status,
        latencyMs: elapsed,
        requestPayload: editContent,
        responsePayload: JSON.stringify(data, null, 2),
        curlCommand: `curl -X PUT "${window.location.origin}${url}" -H "Authorization: Bearer byos_live_YOUR_KEY" -H "Content-Type: application/json" --data '${editContent}'`,
      });

      if (res.ok) {
        toast.success(`Object updated! New version snapshot created in Google Drive. ETag: ${data.etag}`);
        refreshObjectList(selectedBucket);
      } else {
        toast.error("Failed to save edited object.");
      }
    } catch {
      toast.error("Network error saving edits.");
    } finally {
      setExecutingEdit(false);
    }
  };

  const handleGenerateSigned = async () => {
    if (!selectedBucket || !selectedObjKey) return;
    setExecutingSign(true);
    setSignedUrl(null);
    const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(selectedObjKey)}/sign`;
    const startTime = performance.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "get", expiresIn: 3600 }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      const data = await res.json().catch(() => ({}));

      addLog({
        method: "POST",
        url,
        status: res.status,
        latencyMs: elapsed,
        requestPayload: JSON.stringify({ operation: "get", expiresIn: 3600 }, null, 2),
        responsePayload: JSON.stringify(data, null, 2),
        curlCommand: `curl -X POST "${window.location.origin}${url}" -H "Authorization: Bearer byos_live_YOUR_KEY" -H "Content-Type: application/json" -d '{"expiresIn": 3600}'`,
      });

      if (res.ok) {
        setSignedUrl(data.url);
        toast.success("Generated 1-Hr cryptographically signed streaming URL!");
      } else {
        toast.error("Failed to generate signed URL.");
      }
    } catch {
      toast.error("Error signing URL.");
    } finally {
      setExecutingSign(false);
    }
  };

  const handleExecuteDelete = async (key: string) => {
    if (!selectedBucket || !key) return;
    if (!confirm(`Delete object '${key}' permanently from your connected Google Drive?`)) return;
    setExecutingDelete(true);
    const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(key)}`;
    const startTime = performance.now();

    try {
      const res = await fetch(url, { method: "DELETE" });
      const elapsed = Math.round(performance.now() - startTime);

      addLog({
        method: "DELETE",
        url,
        status: res.status,
        latencyMs: elapsed,
        responsePayload: res.status === 204 ? "[No Content - Successfully removed]" : JSON.stringify(await res.json().catch(() => ({})), null, 2),
        curlCommand: `curl -X DELETE "${window.location.origin}${url}" -H "Authorization: Bearer byos_live_YOUR_KEY"`,
      });

      if (res.ok || res.status === 204) {
        toast.success(`Deleted '${key}' from Google Drive storage.`);
        if (selectedObjKey === key) {
          setSelectedObjKey("");
          setViewingContent(null);
        }
        refreshObjectList(selectedBucket);
      } else {
        toast.error("Failed to delete object from Drive.");
      }
    } catch {
      toast.error("Network error executing deletion.");
    } finally {
      setExecutingDelete(false);
    }
  };

  const copyToClip = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    toast.success("Copied command to clipboard!");
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold text-stone-100">S3 Playground</h1>
          <p className="mt-1 text-sm text-stone-400">
            Execute operations and verify S3 protocol behaviors directly against Google Drive.
          </p>
        </div>

        {/* DRIVE HEALTH & BUCKET SELECTOR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {isConnected ? (
            <div className="py-2.5 px-3.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 font-mono text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="truncate max-w-[200px]">Connected: {connectionEmail}</span>
            </div>
          ) : (
            <a href="/api/auth/google/connect">
              <button className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                <HardDrive className="w-4 h-4 mr-1.5" />
                <span>Connect Google Drive</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </a>
          )}

          {isConnected && (
            <div className="flex items-center space-x-2 bg-stone-900 px-3.5 py-2 rounded-lg border border-stone-700">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="bg-transparent text-stone-100 font-mono text-xs font-medium focus:outline-none pr-4 cursor-pointer"
              >
                {buckets.length === 0 && <option value="">No Buckets Yet</option>}
                {buckets.map((b) => (
                  <option key={b.id} value={b.name} className="bg-stone-900 text-stone-100">
                    Bucket: {b.name} ({b.objectCount} objs)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewBucketDialog(true)}
                title="Provision test bucket"
                className="h-7 w-7 text-emerald-400 hover:bg-stone-800 rounded flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DISCONNECTED STATE ALERT */}
      {!isConnected && !loadingOverview && (
        <div className="p-6 bg-stone-900 border border-stone-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-stone-100 font-sans">Google Drive Storage Not Bound Yet</h3>
              <p className="text-xs text-stone-400 font-sans mt-0.5">
                To test real file transfers and object versioning, authorize BYOS to create an isolated <code className="text-emerald-400 font-mono">drive.file</code> staging folder inside your Google Drive.
              </p>
            </div>
          </div>
          <a href="/api/auth/google/connect" className="shrink-0 w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
              Connect Google Drive &rarr;
            </button>
          </a>
        </div>
      )}

      {/* MAIN STUDIO WORKSPACE (TWO-COLUMN GRID ON DESKTOP) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE OPERATIONAL CONTROLS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden shadow-sm">
            <div className="p-6 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-stone-100 text-base">S3 Protocol Execution Bench</h2>
              </div>
              <span className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-mono text-[10px] px-2 py-0.5 rounded-full">
                Zero Runtime Overhead
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6 space-y-6">
              <TabsList className="bg-stone-950 p-1 rounded-lg border border-stone-800 grid grid-cols-4 w-full">
                <TabsTrigger value="upload" className="rounded-md font-medium text-xs py-2 data-[state=active]:bg-stone-900 data-[state=active]:text-emerald-400 text-stone-400">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="list" className="rounded-md font-medium text-xs py-2 data-[state=active]:bg-stone-900 data-[state=active]:text-emerald-400 text-stone-400">
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  Browse ({objectList.length})
                </TabsTrigger>
                <TabsTrigger value="edit" className="rounded-md font-medium text-xs py-2 data-[state=active]:bg-stone-900 data-[state=active]:text-emerald-400 text-stone-400">
                  <Code className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-md font-medium text-xs py-2 data-[state=active]:bg-stone-900 data-[state=active]:text-emerald-400 text-stone-400">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Sign & Delete
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: UPLOAD (PUT OBJECT) */}
              <TabsContent value="upload" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium uppercase text-stone-300">
                    Target Object Key Path in S3 Bucket
                  </label>
                  <input
                    value={uploadKey}
                    onChange={(e) => setUploadKey(e.target.value)}
                    placeholder="e.g., config/database-settings.json"
                    className="w-full bg-stone-950 border border-stone-700 text-stone-100 font-mono text-sm rounded-lg p-3 focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[11px] text-stone-500 font-mono">
                    Slashes (&apos;/&apos;) will automatically organize files into clean virtual folders inside Google Drive.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-medium uppercase text-stone-300">Payload Content Mode</label>
                    <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setUploadMode("text")}
                        className={`px-3 py-1 rounded-md transition-colors ${uploadMode === "text" ? "bg-emerald-400 text-stone-950 font-medium" : "text-stone-400 hover:text-stone-100"}`}
                      >
                        JSON / Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode("file")}
                        className={`px-3 py-1 rounded-md transition-colors ${uploadMode === "file" ? "bg-emerald-400 text-stone-950 font-medium" : "text-stone-400 hover:text-stone-100"}`}
                      >
                        File Attachment
                      </button>
                    </div>
                  </div>

                  {uploadMode === "text" ? (
                    <textarea
                      rows={7}
                      value={textPayload}
                      onChange={(e) => setTextPayload(e.target.value)}
                      className="w-full p-4 rounded-lg bg-stone-950 border border-stone-700 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-400 leading-relaxed"
                    />
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-stone-700 hover:border-emerald-400 bg-stone-950 p-8 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                            setUploadKey(`uploads/${e.target.files[0].name}`);
                          }
                        }}
                      />
                      <Upload className="w-7 h-7 text-emerald-400" />
                      <div className="text-sm font-medium text-stone-100">
                        {selectedFile ? `Selected: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)` : "Click to select a binary file from your computer"}
                      </div>
                      <div className="text-xs text-stone-500 font-mono">Supports all media, archives, and document formats</div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExecuteUpload}
                  disabled={!isConnected || !selectedBucket || executingUpload}
                  className="w-full py-3 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-stone-950 font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                  {executingUpload ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {executingUpload ? "Streaming to Google Drive..." : "Execute S3 PUT Object Request"}
                </button>
              </TabsContent>

              {/* TAB 2: LIST & BROWSE */}
              <TabsContent value="list" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-stone-400">
                    Objects in <strong className="text-stone-100">/{selectedBucket}</strong>
                  </div>
                  <button
                    onClick={() => refreshObjectList(selectedBucket)}
                    className="h-8 px-3 text-xs bg-stone-950 border border-stone-800 text-stone-300 font-mono hover:bg-stone-800 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin text-emerald-400" : ""}`} />
                    Refresh
                  </button>
                </div>

                {objectList.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 font-mono text-xs border border-stone-800 rounded-lg bg-stone-950">
                    No stored objects discovered in this bucket. Switch to the Upload tab to test storing files!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {objectList.map((obj) => {
                      const isSelected = obj.Key === selectedObjKey;
                      return (
                        <div
                          key={obj.Key}
                          onClick={() => {
                            setSelectedObjKey(obj.Key);
                            setEditKey(obj.Key);
                            handleReadContent(obj.Key);
                          }}
                          className={`p-3.5 rounded-lg border font-mono text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isSelected ? "bg-stone-800 border-emerald-400 text-stone-100 font-medium" : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-100 hover:bg-stone-900"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate pr-2">
                            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate">{obj.Key}</span>
                          </div>
                          <div className="flex items-center space-x-4 shrink-0 text-stone-500 text-[11px]">
                            <span>{Math.round(obj.Size / 1024)} KB</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-900 text-stone-400 border border-stone-800 rounded font-mono">
                              ETag: {obj.ETag ? obj.ETag.slice(0, 6) + ".." : "OK"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Content Reader Box */}
                {selectedObjKey && (
                  <div className="space-y-2 pt-4 border-t border-stone-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-medium uppercase text-stone-300 flex items-center space-x-1.5">
                        <Code className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Object Content: {selectedObjKey}</span>
                      </label>
                      <button
                        onClick={() => {
                          const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(selectedObjKey)}`;
                          window.open(url, "_blank");
                        }}
                        className="text-xs text-stone-400 hover:text-stone-100 font-mono inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Raw GET URL
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-stone-950 border border-stone-700 font-mono text-xs text-emerald-400 max-h-48 overflow-y-auto leading-relaxed">
                      {loadingContent ? "Streaming file bytes from Google Drive..." : viewingContent || "Click on an object above to stream its contents live."}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: EDIT & OVERWRITE */}
              <TabsContent value="edit" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium uppercase text-stone-300">Select Object to Overwrite / Edit</label>
                  <select
                    value={editKey}
                    onChange={(e) => {
                      setEditKey(e.target.value);
                      setSelectedObjKey(e.target.value);
                      handleReadContent(e.target.value);
                    }}
                    className="w-full p-3 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 font-mono text-xs focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="" className="bg-stone-900 text-stone-500">-- Choose Object --</option>
                    {objectList.map((o) => (
                      <option key={o.Key} value={o.Key} className="bg-stone-900 text-stone-100">
                        {o.Key} ({Math.round(o.Size / 1024)} KB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium uppercase text-stone-300 flex items-center space-x-1.5">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Content Modification Editor</span>
                  </label>
                  <textarea
                    rows={8}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Select an existing text/JSON object above to edit its live payload..."
                    className="w-full p-4 rounded-lg bg-stone-950 border border-stone-700 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-400 leading-relaxed"
                  />
                </div>

                <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 text-xs flex items-start space-x-2 font-sans">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-stone-100 font-semibold">Automatic Zero-Trust Versioning:</strong> Modifying an existing object will automatically preserve the old revision in your Google Drive history and assign a brand new ETag.
                  </span>
                </div>

                <button
                  onClick={handleExecuteEdit}
                  disabled={!editKey || executingEdit || !isConnected}
                  className="w-full py-3 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium text-sm transition-all"
                >
                  {executingEdit ? "Overwriting in Google Drive..." : "Save Edits & Mint New Version Snapshot"}
                </button>
              </TabsContent>

              {/* TAB 4: PRESIGNED GRANTS & DELETE */}
              <TabsContent value="security" className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium uppercase text-stone-300">Target Object for Security Operations</label>
                  <select
                    value={selectedObjKey}
                    onChange={(e) => setSelectedObjKey(e.target.value)}
                    className="w-full p-3 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 font-mono text-xs focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="" className="bg-stone-900 text-stone-500">-- Choose Object --</option>
                    {objectList.map((o) => (
                      <option key={o.Key} value={o.Key} className="bg-stone-900 text-stone-100">
                        {o.Key}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Presigned url generator box */}
                  <div className="p-5 rounded-lg bg-stone-950 border border-stone-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="font-semibold text-stone-100 text-sm font-sans flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Mint Presigned Grant</span>
                      </div>
                      <p className="text-xs text-stone-400">
                        Generate a secure 1-hour streaming URL that grants read access without exposing API credentials.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateSigned}
                      disabled={!selectedObjKey || executingSign}
                      className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-medium text-xs py-2.5 rounded-lg w-full transition-colors"
                    >
                      {executingSign ? "Signing..." : "Generate 1-Hour Token URL"}
                    </button>
                  </div>

                  {/* Permanent deletion box */}
                  <div className="p-5 rounded-lg bg-stone-950 border border-stone-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="font-semibold text-red-400 text-sm font-sans flex items-center space-x-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <span>Permanent Cloud Deletion</span>
                      </div>
                      <p className="text-xs text-stone-400">
                        Permanently delete this file and all version archives directly from your Google Drive storage folder.
                      </p>
                    </div>
                    <button
                      onClick={() => handleExecuteDelete(selectedObjKey)}
                      disabled={!selectedObjKey || executingDelete}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium text-xs py-2.5 rounded-lg w-full transition-colors"
                    >
                      {executingDelete ? "Deleting from Drive..." : "Execute S3 Delete Request"}
                    </button>
                  </div>
                </div>

                {signedUrl && (
                  <div className="p-4 rounded-lg bg-stone-950 border border-stone-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-emerald-400 font-medium text-xs">
                      <span>Active Presigned Streaming URL (Expires in 3600s)</span>
                      <button
                        onClick={() => copyToClip(signedUrl, "url")}
                        className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-emerald-400 text-[10px] font-medium h-7 px-3 rounded-md transition-colors"
                      >
                        Copy URL
                      </button>
                    </div>
                    <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 break-all text-stone-300 text-xs max-h-24 overflow-y-auto pr-1">
                      {signedUrl}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE API TELEMETRY & NETWORK INSPECTOR (5 cols) */}
        <div className="lg:col-span-5 space-y-6 sticky top-20">
          <div className="bg-stone-900 border border-stone-800 shadow-xl overflow-hidden rounded-lg">
            <div className="p-5 bg-stone-900 border-b border-stone-800 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-stone-100 text-sm font-mono">API Request Inspector</h3>
              </div>
              <button
                onClick={() => setLogs([])}
                className="h-7 px-2.5 text-xs font-mono text-stone-500 hover:text-stone-300 transition-colors"
              >
                Clear Logs
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[620px] overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="py-20 text-center text-stone-500 font-mono text-xs space-y-2">
                  <Code className="w-8 h-8 mx-auto opacity-40 text-stone-500" />
                  <div>No S3 operations executed yet.</div>
                  <div className="text-[11px] text-stone-500">Run an upload, list, or edit on the left to inspect raw HTTP headers and cURL equivalents.</div>
                </div>
              ) : (
                logs.map((log) => {
                  const badgeColor =
                    log.method === "PUT"
                      ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                      : log.method === "GET"
                      ? "bg-sky-400/10 text-sky-400 border-sky-400/20"
                      : log.method === "POST"
                      ? "bg-purple-400/10 text-purple-400 border-purple-400/20"
                      : "bg-red-400/10 text-red-400 border-red-400/20";

                  return (
                    <div key={log.id} className="p-4 rounded-lg bg-stone-950 border border-stone-800 space-y-3 text-stone-300">
                      <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${badgeColor}`}>{log.method}</span>
                          <span className={`text-xs font-semibold ${log.status >= 200 && log.status < 300 ? "text-emerald-400" : "text-red-400"}`}>
                            Status: {log.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-stone-500">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>{log.latencyMs} ms</span>
                          <span>&bull; {log.timestamp}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">Target REST URL:</div>
                        <div className="text-emerald-400 text-xs truncate bg-stone-900 p-2 rounded border border-stone-800">{log.url}</div>
                      </div>

                      {/* cURL Command Copy */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-stone-500 font-semibold uppercase">
                          <span>Equivalent cURL Syntax:</span>
                          <button onClick={() => copyToClip(log.curlCommand, log.id)} className="text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer">
                            {copiedLogId === log.id ? <Check className="w-3 h-3 text-emerald-400 inline" /> : <Copy className="w-3 h-3 inline" />}
                            <span>{copiedLogId === log.id ? "Copied!" : "Copy cURL"}</span>
                          </button>
                        </div>
                        <pre className="text-[11px] text-stone-400 bg-stone-900 p-2.5 rounded-lg border border-stone-800 overflow-x-auto leading-tight font-mono select-all">
                          {log.curlCommand}
                        </pre>
                      </div>

                      {log.responsePayload && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-stone-500 font-semibold uppercase">Server Response:</div>
                          <pre className="text-[11px] text-emerald-400 bg-stone-900 p-2.5 rounded-lg border border-stone-800 overflow-x-auto max-h-32">
                            {log.responsePayload}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* QUICK PROVISION BUCKET DIALOG */}
      <Dialog open={showNewBucketDialog} onOpenChange={setShowNewBucketDialog}>
        <DialogContent className="bg-stone-900 border border-stone-800 text-stone-100 sm:max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-stone-100 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Provision Playground Bucket</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-stone-400 mt-1">
              Instantly creates a designated test folder inside your Google Drive storage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBucket} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm mb-2 text-stone-200">Bucket Identifier</label>
              <input
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                placeholder="e.g., s3-playground-dev"
                required
                className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-400 text-sm font-mono"
              />
            </div>
            <DialogFooter className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewBucketDialog(false)}
                className="px-4 py-2.5 rounded-lg text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBucket || !newBucketName.trim()}
                className="inline-flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {creatingBucket ? "Provisioning..." : "Create Bucket"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
