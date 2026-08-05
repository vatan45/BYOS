"use client";

import React, { useState } from "react";
import {
  Terminal,
  BookOpen,
  Code,
  Copy,
  Check,
  Server,
  Key,
  Shield,
  Sparkles,
  ArrowRight,
  FileText,
  Lock,
  Download,
  Upload,
  Trash2,
  List,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DocumentationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const endpointUrl = typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "https://byos-three.vercel.app/api/v1";

  const sdkInitCode = `import BYOSClient from "byos-sdk";

// Initialize the BYOS client with your production API key and live endpoint
const byos = new BYOSClient({
  apiKey: process.env.BYOS_API_KEY!, // Starts with byos_live_... or byos_test_...
  endpoint: "${endpointUrl}"
});`;

  const sdkUploadCode = `// Upload a binary file or buffer directly to your Google Drive via BYOS
import fs from "fs";

const fileBuffer = fs.readFileSync("./high-res-video.mp4");

const result = await byos.upload("default", "media/2026/high-res-video.mp4", fileBuffer, {
  contentType: "video/mp4",
  metadata: { project: "Staged Demo", author: "Dev Team" }
});

console.log("Upload complete! ETag:", result.etag);`;

  const sdkListCode = `// List stored objects in real-time with prefix filtering and pagination
const response = await byos.list("default", {
  prefix: "media/2026/",
  limit: 50
});

console.log(\`Found \${response.objects.length} objects stored in Google Drive:\`);
for (const obj of response.objects) {
  console.log(\`- \${obj.key}: \${(obj.size / 1024 / 1024).toFixed(2)} MB (Last modified: \${obj.lastModified})\`);
}`;

  const sdkDownloadCode = `// Generate a cryptographically signed, expiring download grant URL for zero-trust sharing
const signedGrant = await byos.getSignedUrl("default", "media/2026/high-res-video.mp4", {
  expiresIn: 3600 // Expire after 1 hour (3600 seconds)
});

console.log("Secure Streaming URL:", signedGrant.url);
console.log("Grant Identifier (for immediate revocation):", signedGrant.grantId);`;

  const sdkRevokeCode = `// Instantly revoke an active presigned streaming grant URL before its expiration time
await byos.revokeSignedUrl("grant-uuid-string");

console.log("Grant revoked successfully. Access attempt will immediately return 403 Forbidden.");`;

  const curlUploadCode = `curl -X PUT "${endpointUrl}/buckets/default/objects/backup-2026.zip" \\
  -H "Authorization: Bearer byos_live_your_api_key_here" \\
  -H "Content-Type: application/zip" \\
  --data-binary "@./backup-2026.zip"`;

  const curlListCode = `curl -X GET "${endpointUrl}/buckets/default/objects?prefix=media/&limit=20" \\
  -H "Authorization: Bearer byos_live_your_api_key_here"`;

  const curlSignCode = `curl -X POST "${endpointUrl}/buckets/default/objects/backup-2026.zip/sign" \\
  -H "Authorization: Bearer byos_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"expiresIn": 3600}'`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 text-stone-200 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-stone-800/80 pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Reference v1.0</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" />
            S3-Compatible API & SDK Documentation
          </h1>
          <p className="text-sm text-stone-400 max-w-2xl font-medium leading-relaxed">
            BYOS gives you production-grade object storage backed entirely by your connected personal Google Drive. Use our ergonomic TypeScript SDK or make direct REST calls to stream files up to 5 GB with $0 vendor markup.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800 shadow-sm shrink-0">
          <Server className="w-5 h-5 text-emerald-400" />
          <div className="text-xs">
            <div className="text-stone-500 uppercase tracking-wider font-mono text-[10px] font-bold">API Base Endpoint</div>
            <div className="font-mono font-bold text-stone-200 mt-0.5 select-all">{endpointUrl}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-8 w-8 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white"
            onClick={() => copyToClipboard(endpointUrl, "base-endpoint")}
          >
            {copiedCode === "base-endpoint" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="sdk" className="w-full space-y-6">
        <TabsList className="bg-stone-900/90 p-1 rounded-2xl border border-stone-800 flex flex-wrap gap-1 w-fit">
          <TabsTrigger
            value="sdk"
            className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-stone-800 data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Code className="w-4 h-4" />
            TypeScript / Node.js SDK
          </TabsTrigger>
          <TabsTrigger
            value="rest"
            className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-stone-800 data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            REST API & cURL Reference
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-stone-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Rate Limits & Error Specs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: NODE/TS SDK */}
        <TabsContent value="sdk" className="space-y-8 animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 gap-6">
            {/* Quickstart Card */}
            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-extrabold text-white">SDK Initialization</CardTitle>
                      <CardDescription className="text-xs text-stone-400">Connect to BYOS using your secret API key</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg">
                    npm install byos-sdk
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(sdkInitCode, "sdk-init")}
                  >
                    {copiedCode === "sdk-init" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{sdkInitCode}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Upload Object */}
            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold text-white">Streaming File Uploads</CardTitle>
                    <CardDescription className="text-xs text-stone-400">Stream files directly into your isolated Google Drive folder with zero server storage overhead</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(sdkUploadCode, "sdk-upload")}
                  >
                    {copiedCode === "sdk-upload" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{sdkUploadCode}</pre>
                </div>
              </CardContent>
            </Card>

            {/* List & Browse */}
            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <List className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold text-white">List Objects & Prefix Browsing</CardTitle>
                    <CardDescription className="text-xs text-stone-400">Query object lists with folder prefix filtering and fast O(1) indexed lookups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(sdkListCode, "sdk-list")}
                  >
                    {copiedCode === "sdk-list" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{sdkListCode}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Presigned URLs */}
            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold text-white">Presigned Streaming Grants</CardTitle>
                    <CardDescription className="text-xs text-stone-400">Mint expiring temporary URLs for zero-trust media playback and client downloads</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(sdkDownloadCode, "sdk-dl")}
                  >
                    {copiedCode === "sdk-dl" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{sdkDownloadCode}</pre>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Zero-Trust Revocation Guarantee:</strong> Every signed grant generates a unique tracking ID in Postgres. Unlike static AWS S3 URLs, BYOS grants can be immediately cancelled before expiration via <code className="text-white font-mono">revokeSignedUrl(grantId)</code>!
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: REST & CURL */}
        <TabsContent value="rest" className="space-y-8 animate-in fade-in-50 duration-300">
          <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 text-sm space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              Authentication Header
            </h3>
            <p className="text-xs text-stone-400">
              Every authenticated REST endpoint expects your API secret key passed in the standard authorization header:
            </p>
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 font-mono text-xs text-emerald-400">
              Authorization: Bearer byos_live_your_api_key_here
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600/20 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 font-mono font-bold px-3 py-1">PUT</Badge>
                  <span className="font-mono text-xs md:text-sm font-bold text-white">/api/v1/buckets/:bucket/objects/*key</span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-stone-400">Upload object binary data directly in the request body.</p>
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(curlUploadCode, "curl-put")}
                  >
                    {copiedCode === "curl-put" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{curlUploadCode}</pre>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-600/20 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold px-3 py-1">GET</Badge>
                  <span className="font-mono text-xs md:text-sm font-bold text-white">/api/v1/buckets/:bucket/objects?prefix=&limit=</span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-stone-400">List stored objects in your connected Google Drive bucket.</p>
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(curlListCode, "curl-get")}
                  >
                    {copiedCode === "curl-get" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{curlListCode}</pre>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="border-b border-stone-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-600/20 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30 font-mono font-bold px-3 py-1">POST</Badge>
                  <span className="font-mono text-xs md:text-sm font-bold text-white">/api/v1/buckets/:bucket/objects/*key/sign</span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-stone-400">Generate a secure presigned streaming download grant.</p>
                <div className="relative group rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs overflow-x-auto text-stone-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white"
                    onClick={() => copyToClipboard(curlSignCode, "curl-sign")}
                  >
                    {copiedCode === "curl-sign" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="leading-relaxed">{curlSignCode}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: RATE LIMITS & SECURITY */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">Rate Limiting Protection</h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                BYOS applies Redis-backed Upstash token-bucket rate limiting across all S3 and management API routes to prevent abuse of your personal Google Drive quota.
              </p>
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-stone-400">
                  <span>Standard Quota limit:</span>
                  <span className="text-emerald-400 font-bold">60 req / 10s</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Exceed behavior:</span>
                  <span className="text-rose-400 font-bold">429 Too Many Requests</span>
                </div>
              </div>
            </Card>

            <Card className="bg-stone-900/60 border-stone-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">Structured S3 Error Schema</h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                When an operation fails (e.g. invalid API key, missing object, or revoked grant), BYOS returns structured S3-compatible JSON payload responses.
              </p>
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-stone-300 leading-relaxed">
                <pre>{`{
  "error": {
    "code": "AccessDenied",
    "message": "Invalid API key or insufficient bucket read permissions.",
    "status": 401,
    "requestId": "byos-req-178579..."
  }
}`}</pre>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
