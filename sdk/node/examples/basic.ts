/**
 * Standalone verification script demonstrating a complete BYOS SDK lifecycle
 * importing directly from the compiled release bundle (`../dist`).
 *
 * To run this against your locally running Next.js development server:
 *   BYOS_API_KEY="byos_live_..." BYOS_BUCKET="my-bucket" npx tsx examples/basic.ts
 */

import BYOSClient, { BYOSNotFoundError, BYOSError } from "../dist/index";
import * as crypto from "crypto";

async function runDemo() {
  const apiKey = process.env.BYOS_API_KEY || "byos_live_example_test_key_placeholder";
  const bucket = process.env.BYOS_BUCKET || "my-bucket";
  const baseUrl = process.env.BYOS_API_URL || "http://localhost:3000";

  console.log(`🚀 BYOS SDK Lifecycle Test Script (${baseUrl})`);
  console.log(`📦 Target Bucket: ${bucket}`);
  console.log("---------------------------------------------------------");

  const byos = new BYOSClient({
    apiKey,
    bucket,
    baseUrl,
    maxRetries: 3,
  });

  const testKey = `sdk-demo/test-artifact-${Date.now()}.txt`;
  const samplePayload = `Hello from byos-sdk standalone verification script! Generated at ${new Date().toISOString()}`;

  try {
    // 1. Upload Object (S3 PutObject equivalent)
    console.log(`\n1️⃣ Uploading artifact to '${testKey}'...`);
    const uploadRes = await byos.upload(testKey, samplePayload, {
      contentType: "text/plain; charset=utf-8",
    });
    console.log("   ✅ Upload success!");
    console.log("      • Key:", uploadRes.key);
    console.log("      • Size:", uploadRes.size, "bytes");
    console.log("      • ETag:", uploadRes.etag);
    console.log("      • Version ID:", uploadRes.versionId);

    // 2. Fetch Metadata without payload (S3 HeadObject equivalent)
    console.log(`\n2️⃣ Inspecting remote headers with getMetadata...`);
    const meta = await byos.getMetadata(testKey);
    console.log("   ✅ Metadata retrieved:");
    console.log("      • Content-Type:", meta.contentType);
    console.log("      • Content-Length:", meta.contentLength);

    // 3. Download Object (S3 GetObject equivalent)
    console.log(`\n3️⃣ Downloading streaming payload from BYOS...`);
    const downloadRes = await byos.download(testKey);
    const downloadedText = await downloadRes.text();
    console.log("   ✅ Download success! Content integrity match:", downloadedText === samplePayload);
    console.log(`      • Sample output: "${downloadedText.slice(0, 50)}..."`);

    // 4. Generate Presigned URL (S3 getSignedUrl equivalent)
    console.log(`\n4️⃣ Creating 1-hour presigned client download URL...`);
    const signed = await byos.getSignedUrl(testKey, { operation: "get", expiresIn: 3600 });
    console.log("   ✅ Presigned URL created:");
    console.log("      • URL:", signed.url);
    console.log("      • Expires:", signed.expiresAt);

    // 5. List Objects in Bucket (S3 ListObjectsV2 equivalent)
    console.log(`\n5️⃣ Listing bucket items matching prefix 'sdk-demo/'...`);
    const listRes = await byos.list({ prefix: "sdk-demo/" });
    console.log(`   ✅ Found ${listRes.contents.length} object(s). IsTruncated: ${listRes.isTruncated}`);
    listRes.contents.slice(0, 3).forEach((item) => {
      console.log(`      - [${item.syncStatus}] ${item.key} (${item.size} bytes)`);
    });

    // 6. Delete Object (S3 DeleteObject equivalent)
    console.log(`\n6️⃣ Permanently deleting '${testKey}'...`);
    await byos.delete(testKey);
    console.log("   ✅ Object removed successfully.");

    // 7. Verify deletion with typed error catch
    console.log(`\n7️⃣ Verifying deletion via getMetadata...`);
    try {
      await byos.getMetadata(testKey);
      console.error("   ❌ Unexpectedly found object after delete!");
    } catch (err) {
      if (err instanceof BYOSNotFoundError) {
        console.log("   ✅ Received expected BYOSNotFoundError (404 NoSuchKey). Lifecycle complete!");
      } else {
        throw err;
      }
    }
  } catch (err: any) {
    if (apiKey === "byos_live_example_test_key_placeholder") {
      console.log("\n⚠️ Note: Script attempted execution with a placeholder test API key.");
      console.log("   To execute real operations against your live local server, generate an API key");
      console.log("   via POST /api/v1/keys and run:");
      console.log('   BYOS_API_KEY="byos_live_..." BYOS_BUCKET="my-bucket" npx tsx examples/basic.ts\n');
      console.log(`   Expected rejection received from server: [${err.name || "Error"}] ${err.message}`);
    } else {
      console.error("\n❌ Demonstration failed with error:", err instanceof BYOSError ? `[${err.code} - HTTP ${err.status}] ${err.message}` : err);
      process.exit(1);
    }
  }
}

runDemo();
