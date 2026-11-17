"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FolderTree,
  Folder,
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileArchive,
  File,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  History,
  AlertCircle,
  X,
  ChevronRight,
  Shield,
  Key,
  HardDrive,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ObjectItem {
  Key: string;
  Size: number;
  ETag?: string;
  LastModified?: string;
  SyncStatus?: "synced" | "discovered_in_provider" | "missing_in_provider" | string;
}

interface VersionItem {
  VersionId: string;
  VersionNumber: number;
  Size: number;
  CreatedAt: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileTypeIcon(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext || "")) return <FileImage className="w-4 h-4 text-[#d8f99c]" />;
  if (["mp4", "mov", "webm", "avi"].includes(ext || "")) return <FileVideo className="w-4 h-4 text-[#d8f99c]" />;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext || "")) return <FileText className="w-4 h-4 text-[#d8f99c]" />;
  if (["zip", "tar", "gz", "rar"].includes(ext || "")) return <FileArchive className="w-4 h-4 text-[#d8f99c]" />;
  if (["js", "ts", "json", "html", "css", "py", "go", "rs"].includes(ext || "")) return <FileCode className="w-4 h-4 text-[#d8f99c]" />;
  return <File className="w-4 h-4 text-[#929a8d]" />;
}

function ObjectBrowserContent() {
  const searchParams = useSearchParams();
  const initialBucket = searchParams.get("bucket") || "";

  const [buckets, setBuckets] = useState<Array<{ name: string; id: string }>>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>(initialBucket);
  const [activeApiKey, setActiveApiKey] = useState<string>("");
  const [apiKeyList, setApiKeyList] = useState<Array<{ id: string; keyPrefix: string; name: string }>>([]);

  // Navigation & Listing state
  const [currentPrefix, setCurrentPrefix] = useState<string>("");
  const [objectsList, setObjectsList] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Side Sheet State
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Drag-and-Drop Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.buckets) {
          setBuckets(data.buckets);
          if (!selectedBucket && data.buckets.length > 0) {
            setSelectedBucket(data.buckets[0].name);
          }
        }
      });

    fetch("/api/v1/keys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.keys && data.keys.length > 0) {
          setApiKeyList(data.keys);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedBucket && activeApiKey) {
      fetchObjects();
    }
  }, [selectedBucket, currentPrefix, activeApiKey]);

  const fetchObjects = async () => {
    if (!selectedBucket || !activeApiKey) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects?prefix=${encodeURIComponent(currentPrefix)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeApiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setObjectsList(data.Contents || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err?.error?.message || "Failed to query objects from storage engine.");
        setObjectsList([]);
      }
    } catch {
      setErrorMsg("Network error communicating with BYOS S3 endpoint.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedBucket || !activeApiKey) {
      toast.error("Please select an active API Key and storage bucket first.");
      return;
    }
    setUploading(true);

    const key = `${currentPrefix}${file.name}`;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch(`/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${activeApiKey}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: arrayBuffer,
      });

      if (res.ok) {
        toast.success(`Uploaded '${key}' successfully to Google Drive!`);
        fetchObjects();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message || "Upload rejected by S3 translation engine.");
      }
    } catch {
      toast.error("Network exception occurred during file transfer.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const fetchVersions = async (key: string) => {
    if (!selectedBucket || !activeApiKey) return;
    setLoadingVersions(true);
    setVersions([]);
    try {
      const res = await fetch(`/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(key)}/versions`, {
        headers: { Authorization: `Bearer ${activeApiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.Versions || []);
      }
    } catch (e) {
      console.error("Error fetching version snapshots:", e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSelectObject = (obj: ObjectItem) => {
    setSelectedObject(obj);
    setSignedUrl(null);
    fetchVersions(obj.Key);
  };

  const handleGenerateSignedUrl = async () => {
    if (!selectedObject || !selectedBucket || !activeApiKey) return;
    try {
      const res = await fetch(`/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(selectedObject.Key)}/sign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation: "get", expiresIn: 3600 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSignedUrl(data.url);
        navigator.clipboard.writeText(data.url);
        setCopiedUrl(true);
        toast.success("1-Hr Presigned URL copied to clipboard!");
        setTimeout(() => setCopiedUrl(false), 2500);
      } else {
        toast.error("Failed to sign URL: Ensure your API key has authorization.");
      }
    } catch {
      toast.error("Network error generating presigned transfer token.");
    }
  };

  const handleDownload = async () => {
    if (!selectedObject || !selectedBucket || !activeApiKey) return;
    try {
      const res = await fetch(`/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(selectedObject.Key)}`, {
        headers: { Authorization: `Bearer ${activeApiKey}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = selectedObject.Key.split("/").pop() || "downloaded_file";
        a.click();
        toast.success("File download initiated.");
      } else {
        toast.error("Download stream failed.");
      }
    } catch {
      toast.error("Download connection error.");
    }
  };

  const handleDelete = async () => {
    if (!selectedObject || !selectedBucket || !activeApiKey) return;
    if (!confirm(`Are you certain you wish to delete '${selectedObject.Key}' directly from Google Drive?`)) return;
    try {
      const res = await fetch(`/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(selectedObject.Key)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeApiKey}` },
      });
      if (res.ok || res.status === 204) {
        setSelectedObject(null);
        toast.success("Object deleted from Google Drive.");
        fetchObjects();
      } else {
        toast.error("Failed to delete object from Drive.");
      }
    } catch {
      toast.error("Network error deleting file.");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedObject || !selectedBucket || !activeApiKey) return;
    if (!confirm("Restore this version snapshot as the new current active content?")) return;
    try {
      const res = await fetch(
        `/api/v1/buckets/${encodeURIComponent(selectedBucket)}/objects/${encodeURIComponent(selectedObject.Key)}/versions/${versionId}/restore`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${activeApiKey}`, "Content-Type": "application/json" },
        }
      );
      if (res.ok) {
        toast.success("Version snapshot restored successfully to Google Drive!");
        fetchVersions(selectedObject.Key);
        fetchObjects();
      } else {
        toast.error("Restore operation failed.");
      }
    } catch {
      toast.error("Network exception during restore.");
    }
  };

  const foldersSet = new Set<string>();
  const filesList: ObjectItem[] = [];

  objectsList.forEach((obj) => {
    const relKey = obj.Key.slice(currentPrefix.length);
    const slashIdx = relKey.indexOf("/");
    if (slashIdx !== -1) {
      const folderName = currentPrefix + relKey.slice(0, slashIdx + 1);
      foldersSet.add(folderName);
    } else {
      filesList.push(obj);
    }
  });

  const foldersList = Array.from(foldersSet);
  const breadcrumbs = currentPrefix.split("/").filter(Boolean);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HEADER WITH BUCKET AND KEY SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold text-stone-100">Objects</h1>
          <p className="mt-1 text-sm text-stone-400">
            Browse files, upload objects, inspect version history, and generate presigned links.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Bucket dropdown */}
          <div className="flex items-center space-x-2 bg-stone-900 px-3.5 py-2.5 rounded-lg border border-stone-700">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={selectedBucket}
              onChange={(e) => {
                setSelectedBucket(e.target.value);
                setCurrentPrefix("");
                setSelectedObject(null);
              }}
              className="bg-transparent text-stone-100 font-mono text-xs font-medium focus:outline-none pr-4 cursor-pointer"
            >
              {buckets.length === 0 && <option value="">No Buckets</option>}
              {buckets.map((b) => (
                <option key={b.id} value={b.name} className="bg-stone-900 text-stone-100">
                  Bucket: {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key dropdown */}
          <div className="flex items-center space-x-2 bg-stone-900 px-3.5 py-2.5 rounded-lg border border-stone-700">
            <Key className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={activeApiKey}
              onChange={(e) => setActiveApiKey(e.target.value)}
              className="bg-transparent text-stone-100 font-mono text-xs font-medium focus:outline-none pr-4 cursor-pointer"
            >
              <option value="" className="bg-stone-900 text-stone-400">-- Select Auth Key --</option>
              {apiKeyList.map((k) => (
                <option key={k.id} value={`byos_live_${k.keyPrefix}`} className="bg-stone-900 text-stone-100">
                  Key: {k.name} ({k.keyPrefix}...)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DRAG AND DROP UPLOAD BOX */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-lg border border-dashed p-8 text-center transition-all cursor-pointer ${
          isDragging ? "border-emerald-400 bg-emerald-400/10" : "border-stone-700 bg-stone-900/40 hover:bg-stone-900 hover:border-emerald-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
          }}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-emerald-400 shadow-sm">
            <Upload className={`w-5 h-5 ${uploading ? "animate-bounce" : ""}`} />
          </div>
          <div className="text-sm font-medium text-stone-100">
            {uploading ? "Uploading to Google Drive…" : "Click or drag & drop files here to upload"}
          </div>
          <div className="text-xs text-stone-400 font-mono">
            Destination: <code className="text-emerald-400 font-semibold">/{selectedBucket}/{currentPrefix}</code>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BREADCRUMB NAVIGATION */}
      <div className="flex items-center justify-between bg-stone-900 px-4 py-2.5 rounded-lg border border-stone-800 font-mono text-xs">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
          <button
            onClick={() => {
              setCurrentPrefix("");
              setSelectedObject(null);
            }}
            className="text-emerald-400 hover:underline font-medium"
          >
            ROOT
          </button>
          {breadcrumbs.map((crumb, idx) => {
            const path = breadcrumbs.slice(0, idx + 1).join("/") + "/";
            return (
              <React.Fragment key={path}>
                <span className="text-stone-600">/</span>
                <button
                  onClick={() => {
                    setCurrentPrefix(path);
                    setSelectedObject(null);
                  }}
                  className="text-stone-300 hover:underline font-medium shrink-0"
                >
                  {crumb}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchObjects}
          disabled={loading || !activeApiKey}
          className="h-7 w-7 text-stone-400 hover:text-emerald-400 hover:bg-stone-800"
          title="Refresh directory listing"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
        </Button>
      </div>

      {/* OBJECTS TABLE USING CLEAN STONE THEME */}
      <div className="border border-stone-800 rounded-lg overflow-hidden bg-stone-900/40">
        <div className="py-4 px-6 bg-stone-900 border-b border-stone-800 flex flex-row items-center justify-between">
          <span className="text-sm font-semibold text-stone-100">
            Directory Contents ({foldersList.length} Folders, {filesList.length} Files)
          </span>
          <span className="text-xs text-stone-500 font-mono">Delimiter: &apos;/&apos;</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full bg-stone-900" />
            <Skeleton className="h-10 w-full bg-stone-900" />
            <Skeleton className="h-10 w-full bg-stone-900" />
          </div>
        ) : foldersList.length === 0 && filesList.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-400">
            {activeApiKey ? "Drag & drop files above to upload your first cloud object into this folder." : "Please select an active API Key from the dropdown above to display encrypted contents."}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-stone-900/80">
              <TableRow className="border-stone-800 hover:bg-transparent">
                <TableHead className="py-3 px-6 text-xs uppercase text-stone-400 font-medium">Name & Path</TableHead>
                <TableHead className="py-3 px-6 text-xs uppercase text-stone-400 font-medium">File Size</TableHead>
                <TableHead className="py-3 px-6 text-xs uppercase text-stone-400 font-medium">Modified Date</TableHead>
                <TableHead className="py-3 px-6 text-xs uppercase text-stone-400 font-medium">Sync Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-800/60 text-sm">
              {/* Render Folders First */}
              {foldersList.map((f) => {
                const displayFolder = f.slice(currentPrefix.length);
                return (
                  <TableRow
                    key={f}
                    onClick={() => {
                      setCurrentPrefix(f);
                      setSelectedObject(null);
                    }}
                    className="hover:bg-stone-800/30 transition-colors cursor-pointer border-stone-800/60 font-mono text-xs"
                  >
                    <TableCell className="py-3.5 px-6 flex items-center space-x-3 text-emerald-400 font-medium">
                      <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{displayFolder}</span>
                    </TableCell>
                    <TableCell className="py-3.5 px-6 text-stone-500 font-mono">&mdash;</TableCell>
                    <TableCell className="py-3.5 px-6 text-stone-500 font-mono">&mdash;</TableCell>
                    <TableCell className="py-3.5 px-6">
                      <span className="text-[10px] uppercase bg-stone-800 text-stone-400 border border-stone-700 font-mono px-2 py-0.5 rounded">
                        Directory
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Render Objects */}
              {filesList.map((obj) => {
                const displayFile = obj.Key.slice(currentPrefix.length);
                const badge =
                  obj.SyncStatus === "synced"
                    ? { color: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", text: "Synced" }
                    : obj.SyncStatus === "discovered_in_provider"
                    ? { color: "bg-amber-400/10 text-amber-400 border-amber-400/20", text: "Discovered in Drive" }
                    : { color: "bg-red-400/10 text-red-400 border-red-400/20", text: "Missing in Provider" };

                return (
                  <TableRow
                    key={obj.Key}
                    onClick={() => handleSelectObject(obj)}
                    className="cursor-pointer transition-colors hover:bg-stone-800/30 border-stone-800/60"
                  >
                    <TableCell className="py-3.5 px-6 font-medium text-stone-100 flex items-center space-x-3 font-sans truncate">
                      <span className="shrink-0">{getFileTypeIcon(obj.Key)}</span>
                      <span className="truncate hover:text-emerald-400 transition-colors">{displayFile}</span>
                    </TableCell>
                    <TableCell className="py-3.5 px-6 font-mono text-stone-400 text-xs">{formatBytes(obj.Size)}</TableCell>
                    <TableCell className="py-3.5 px-6 font-mono text-stone-500 text-xs">
                      {obj.LastModified ? new Date(obj.LastModified).toLocaleDateString() : "Just now"}
                    </TableCell>
                    <TableCell className="py-3.5 px-6 font-mono text-xs">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${badge.color}`}>
                        {badge.text}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* SHEET SLIDE-OVER PANEL FOR OBJECT DETAILS */}
      <Sheet open={!!selectedObject} onOpenChange={(open) => { if (!open) setSelectedObject(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-stone-900 border-l border-stone-800 text-stone-100 p-6 overflow-y-auto space-y-6">
          {selectedObject && (
            <>
              <SheetHeader className="text-left border-b border-stone-800 pb-4 pr-6">
                <div className="text-xs font-mono font-medium uppercase text-emerald-400 tracking-wider">Object Metadata</div>
                <SheetTitle className="text-xl font-semibold text-stone-100 truncate font-sans flex items-center space-x-2 pt-1">
                  <span>{getFileTypeIcon(selectedObject.Key)}</span>
                  <span className="truncate">{selectedObject.Key.split("/").pop()}</span>
                </SheetTitle>
                <SheetDescription className="text-xs text-stone-400 font-mono truncate">
                  Key: /{selectedObject.Key}
                </SheetDescription>
              </SheetHeader>

              {/* Quick action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-medium text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  Download
                </button>
                <button
                  onClick={handleGenerateSignedUrl}
                  className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-medium text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                  {copiedUrl ? "Copied URL!" : "1-Hr Signed Link"}
                </button>
              </div>

              {signedUrl && (
                <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-1.5 text-xs font-mono break-all">
                  <div className="text-xs text-emerald-400 font-medium uppercase flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Presigned Transfer Token Active</span>
                  </div>
                  <div className="text-stone-300 text-xs max-h-24 overflow-y-auto pr-1 bg-stone-900 p-2 rounded border border-stone-800">{signedUrl}</div>
                </div>
              )}

              {/* Metadata Summary */}
              <div className="space-y-2.5 font-mono text-xs bg-stone-950 p-4 rounded-lg border border-stone-800">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Full Key Path:</span>
                  <span className="text-stone-100 truncate max-w-[180px] font-medium" title={selectedObject.Key}>{selectedObject.Key}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">File Size:</span>
                  <span className="text-stone-100 font-semibold">{formatBytes(selectedObject.Size)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Content ETag:</span>
                  <span className="text-stone-400 truncate max-w-[140px]">{selectedObject.ETag || "Computed Hash"}</span>
                </div>
              </div>

              {/* VERSION HISTORY SNAPSHOTS */}
              <div className="space-y-3 pt-3 border-t border-stone-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-100 uppercase tracking-wider flex items-center space-x-1.5 font-mono text-xs">
                    <History className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Version Snapshots ({versions.length})</span>
                  </span>
                  <span className="text-xs text-stone-500 font-mono">Keep Last 10</span>
                </div>

                {loadingVersions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full bg-stone-950 rounded-lg" />
                    <Skeleton className="h-12 w-full bg-stone-950 rounded-lg" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="p-4 rounded-lg bg-stone-950 text-center text-stone-400 text-xs font-mono border border-stone-800">
                    No previous version archives recorded.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 font-mono text-xs">
                    {versions.map((v, i) => (
                      <div
                        key={v.VersionId}
                        className="p-3 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-medium text-stone-200 flex items-center space-x-2">
                            <span>Version {v.VersionNumber}</span>
                            {i === 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 uppercase font-mono">Latest</span>}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {new Date(v.CreatedAt).toLocaleString()} ({formatBytes(v.Size)})
                          </div>
                        </div>
                        {i !== 0 && (
                          <button
                            onClick={() => handleRestoreVersion(v.VersionId)}
                            className="h-7 px-2.5 rounded-lg bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 text-xs font-medium border border-emerald-400/20 transition-colors"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DELETE BUTTON */}
              <div className="pt-4 border-t border-stone-800">
                <button
                  onClick={handleDelete}
                  className="w-full py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete from Google Drive
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ObjectBrowserPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-6">
          <Skeleton className="h-12 w-full rounded-lg bg-stone-900" />
          <Skeleton className="h-[500px] w-full rounded-lg bg-stone-900" />
        </div>
      }
    >
      <ObjectBrowserContent />
    </Suspense>
  );
}
