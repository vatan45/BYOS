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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER WITH BUCKET AND KEY SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="preview-heading">
          <h6>STORAGE BROWSER</h6>
          <h1>Interactive Object Explorer</h1>
          <p className="muted">
            Browse directory structures, drag-and-drop file transfers, inspect version snapshots, and generate presigned links.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Bucket dropdown */}
          <div className="flex items-center space-x-2 bg-[#111411] px-3.5 py-2 rounded-xl border border-[#292d29]">
            <HardDrive className="w-4 h-4 text-[#d8f99c] shrink-0" />
            <select
              value={selectedBucket}
              onChange={(e) => {
                setSelectedBucket(e.target.value);
                setCurrentPrefix("");
                setSelectedObject(null);
              }}
              className="bg-transparent text-[#f0f2eb] font-mono text-xs font-medium focus:outline-none pr-4 cursor-pointer"
            >
              {buckets.length === 0 && <option value="">No Buckets</option>}
              {buckets.map((b) => (
                <option key={b.id} value={b.name} className="bg-[#111411] text-[#f0f2eb]">
                  Bucket: {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key dropdown */}
          <div className="flex items-center space-x-2 bg-[#111411] px-3.5 py-2 rounded-xl border border-[#292d29]">
            <Key className="w-4 h-4 text-[#d8f99c] shrink-0" />
            <select
              value={activeApiKey}
              onChange={(e) => setActiveApiKey(e.target.value)}
              className="bg-transparent text-[#f0f2eb] font-mono text-xs font-medium focus:outline-none pr-4 cursor-pointer"
            >
              <option value="" className="bg-[#111411] text-[#929a8d]">-- Select Auth Key --</option>
              {apiKeyList.map((k) => (
                <option key={k.id} value={`byos_live_${k.keyPrefix}`} className="bg-[#111411] text-[#f0f2eb]">
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
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          isDragging ? "border-[#d8f99c] bg-[#d8f99c]/10" : "border-[#292d29] bg-[#111411] hover:bg-[#141814] hover:border-[#384038]"
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
          <div className="w-12 h-12 rounded-2xl bg-[#0e110e] border border-[#292d29] flex items-center justify-center text-[#d8f99c] shadow-sm">
            <Upload className={`w-5 h-5 ${uploading ? "animate-bounce" : ""}`} />
          </div>
          <div className="text-sm font-semibold text-[#f0f2eb]">
            {uploading ? "Streaming transfer to Google Drive..." : "Click or Drag & Drop File Here to Upload"}
          </div>
          <div className="text-xs text-[#929a8d] font-mono">
            Target Destination: <code className="text-[#d8f99c] font-semibold">/{selectedBucket}/{currentPrefix}</code>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BREADCRUMB NAVIGATION */}
      <div className="flex items-center justify-between bg-[#111411] px-4 py-2.5 rounded-xl border border-[#292d29] font-mono text-xs">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <Folder className="w-4 h-4 text-[#d8f99c] shrink-0" />
          <button
            onClick={() => {
              setCurrentPrefix("");
              setSelectedObject(null);
            }}
            className="text-[#d8f99c] hover:underline font-bold"
          >
            ROOT
          </button>
          {breadcrumbs.map((crumb, idx) => {
            const path = breadcrumbs.slice(0, idx + 1).join("/") + "/";
            return (
              <React.Fragment key={path}>
                <span className="text-[#41483e]">/</span>
                <button
                  onClick={() => {
                    setCurrentPrefix(path);
                    setSelectedObject(null);
                  }}
                  className="text-[#d3d9cc] hover:underline font-medium shrink-0"
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
          className="h-7 w-7 text-[#929a8d] hover:text-[#d8f99c] hover:bg-[#182018]"
          title="Refresh directory listing"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#d8f99c]" : ""}`} />
        </Button>
      </div>

      {/* OBJECTS TABLE USING LANDING SYSTEM STYLING */}
      <Card className="bg-[#111411] border-[#292d29] overflow-hidden shadow-sm">
        <CardHeader className="py-4 px-6 bg-[#0e110e] border-b border-[#292d29] flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider font-semibold text-[#929a8d]">
            Directory Contents ({foldersList.length} Folders, {filesList.length} Files)
          </CardTitle>
          <span className="text-[11px] text-[#555d52] font-mono">Delimiter: &apos;/&apos;</span>
        </CardHeader>

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full bg-[#182018]" />
            <Skeleton className="h-10 w-full bg-[#182018]" />
            <Skeleton className="h-10 w-full bg-[#182018]" />
          </div>
        ) : foldersList.length === 0 && filesList.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="This directory is currently empty"
              description={activeApiKey ? "Drag & drop files above to upload your first cloud object into this folder." : "Please select an active API Key from the dropdown above to display encrypted contents."}
              icon={<Folder className="w-8 h-8 text-[#555d52]" />}
              badgeText="Directory Empty"
            />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#0e110e]">
              <TableRow className="border-[#292d29] hover:bg-transparent">
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-[#929a8d] font-medium">Name & Path</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-[#929a8d] font-medium">File Size</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-[#929a8d] font-medium">Modified Date</TableHead>
                <TableHead className="py-3.5 px-6 font-mono text-[11px] uppercase text-[#929a8d] font-medium">Sync Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#292d29] text-sm">
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
                    className="hover:bg-[#182018]/50 transition-colors cursor-pointer border-[#292d29] font-mono text-xs"
                  >
                    <TableCell className="py-4 px-6 flex items-center space-x-3 text-[#d8f99c] font-medium">
                      <Folder className="w-4 h-4 text-[#d8f99c] shrink-0" />
                      <span className="truncate">{displayFolder}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-[#555d52] font-mono">&mdash;</TableCell>
                    <TableCell className="py-4 px-6 text-[#555d52] font-mono">&mdash;</TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge variant="outline" className="text-[10px] uppercase bg-[#182018] text-[#929a8d] border-[#292d29] font-mono">
                        Directory
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Render Objects */}
              {filesList.map((obj) => {
                const displayFile = obj.Key.slice(currentPrefix.length);
                const badge =
                  obj.SyncStatus === "synced"
                    ? { color: "bg-[#182018] text-[#d8f99c] border-[#292d29]", text: "Synced" }
                    : obj.SyncStatus === "discovered_in_provider"
                    ? { color: "bg-[#201d14] text-[#d9b15b] border-[#3d3623]", text: "Discovered in Drive" }
                    : { color: "bg-[#251616] text-[#e06c6c] border-[#442222]", text: "Missing in Provider" };

                return (
                  <TableRow
                    key={obj.Key}
                    onClick={() => handleSelectObject(obj)}
                    className="cursor-pointer transition-colors hover:bg-[#182018]/60 border-[#292d29]"
                  >
                    <TableCell className="py-4 px-6 font-medium text-[#f0f2eb] flex items-center space-x-3 font-sans truncate">
                      <span className="shrink-0">{getFileTypeIcon(obj.Key)}</span>
                      <span className="truncate hover:text-[#d8f99c] transition-colors">{displayFile}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6 font-mono text-[#929a8d] text-xs">{formatBytes(obj.Size)}</TableCell>
                    <TableCell className="py-4 px-6 font-mono text-[#555d52] text-xs">
                      {obj.LastModified ? new Date(obj.LastModified).toLocaleDateString() : "Just now"}
                    </TableCell>
                    <TableCell className="py-4 px-6 font-mono text-xs">
                      <Badge variant="outline" className={`text-[11px] font-mono ${badge.color}`}>
                        {badge.text}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* SHEET SLIDE-OVER PANEL FOR OBJECT DETAILS */}
      <Sheet open={!!selectedObject} onOpenChange={(open) => { if (!open) setSelectedObject(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#111411] border-l border-[#292d29] text-[#f0f2eb] p-6 overflow-y-auto space-y-6">
          {selectedObject && (
            <>
              <SheetHeader className="text-left border-b border-[#292d29] pb-4 pr-6">
                <div className="text-[10px] font-mono font-bold uppercase text-[#d8f99c] tracking-wider">Object Metadata & Operations</div>
                <SheetTitle className="text-lg font-bold text-[#f0f2eb] truncate font-sans flex items-center space-x-2 pt-1">
                  <span>{getFileTypeIcon(selectedObject.Key)}</span>
                  <span className="truncate">{selectedObject.Key.split("/").pop()}</span>
                </SheetTitle>
                <SheetDescription className="text-xs text-[#929a8d] font-mono truncate">
                  Key: /{selectedObject.Key}
                </SheetDescription>
              </SheetHeader>

              {/* Quick action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleDownload}
                  className="bg-[#182018] hover:bg-[#202b20] border border-[#292d29] text-[#f0f2eb] font-semibold text-xs py-5 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[#d8f99c]" />
                  Download Stream
                </Button>
                <Button
                  onClick={handleGenerateSignedUrl}
                  className="bg-[#d8f99c] hover:bg-[#cbf187] text-[#0c0e0d] font-semibold text-xs py-5 rounded-xl transition-colors"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                  {copiedUrl ? "Copied URL!" : "1-Hr Signed Link"}
                </Button>
              </div>

              {signedUrl && (
                <div className="p-3.5 rounded-xl bg-[#0e110e] border border-[#292d29] space-y-1.5 text-xs font-mono break-all">
                  <div className="text-[10px] text-[#d8f99c] font-medium uppercase flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d8f99c]" />
                    <span>Presigned Transfer Token Active</span>
                  </div>
                  <div className="text-[#929a8d] text-[11px] max-h-24 overflow-y-auto pr-1 bg-[#111411] p-2 rounded border border-[#292d29]">{signedUrl}</div>
                </div>
              )}

              {/* Metadata Summary */}
              <div className="space-y-2.5 font-mono text-xs bg-[#0e110e] p-4 rounded-xl border border-[#292d29]">
                <div className="flex justify-between items-center">
                  <span className="text-[#929a8d]">Full Key Path:</span>
                  <span className="text-[#f0f2eb] truncate max-w-[180px] font-medium" title={selectedObject.Key}>{selectedObject.Key}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#929a8d]">File Size:</span>
                  <span className="text-[#f0f2eb] font-semibold">{formatBytes(selectedObject.Size)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#929a8d]">Content ETag:</span>
                  <span className="text-[#929a8d] truncate max-w-[140px]">{selectedObject.ETag || "Computed Hash"}</span>
                </div>
              </div>

              {/* VERSION HISTORY SNAPSHOTS */}
              <div className="space-y-3 pt-3 border-t border-[#292d29]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#f0f2eb] uppercase tracking-wider flex items-center space-x-1.5 font-mono text-[11px]">
                    <History className="w-4 h-4 text-[#d8f99c] shrink-0" />
                    <span>Version Snapshots ({versions.length})</span>
                  </span>
                  <span className="text-[10px] text-[#555d52] font-mono">Keep Last 10</span>
                </div>

                {loadingVersions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full bg-[#182018] rounded-xl" />
                    <Skeleton className="h-14 w-full bg-[#182018] rounded-xl" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0e110e] text-center text-[#929a8d] text-xs font-mono border border-[#292d29]">
                    No previous version archives recorded.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 font-mono text-xs">
                    {versions.map((v, i) => (
                      <div
                        key={v.VersionId}
                        className="p-3 rounded-xl bg-[#0e110e] border border-[#292d29] flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-[#f0f2eb] flex items-center space-x-2">
                            <span>Version {v.VersionNumber}</span>
                            {i === 0 && <Badge variant="outline" className="px-1.5 py-0 rounded text-[9px] bg-[#182018] text-[#d8f99c] border-[#292d29] uppercase font-mono">Latest</Badge>}
                          </div>
                          <div className="text-[10px] text-[#555d52] mt-0.5">
                            {new Date(v.CreatedAt).toLocaleString()} ({formatBytes(v.Size)})
                          </div>
                        </div>
                        {i !== 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreVersion(v.VersionId)}
                            className="h-7 px-2.5 rounded-lg bg-[#182018] hover:bg-[#202b20] text-[#d8f99c] border-[#292d29] text-[10px] font-semibold"
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DELETE BUTTON */}
              <div className="pt-4 border-t border-[#292d29]">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full py-5 rounded-xl bg-[#251616] hover:bg-[#341b1b] border-[#442222] text-[#e06c6c] hover:text-[#f28b8b] text-xs font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-2 shrink-0" />
                  Delete from Google Drive
                </Button>
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
          <Skeleton className="h-12 w-full rounded-xl bg-[#182018]" />
          <Skeleton className="h-[500px] w-full rounded-2xl bg-[#182018]" />
        </div>
      }
    >
      <ObjectBrowserContent />
    </Suspense>
  );
}
