import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users, buckets, objects, usageDailyRollups } from "@/lib/db/schema";
import { getDashboardSessionUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api/errors";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/stats
 * Platform aggregate usage metrics.
 */
export async function GET(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized");
  }

  const allowedAdminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];

  if (!allowedAdminEmails.includes(user.email.toLowerCase())) {
    return errorResponse("AccessDenied", "Access denied.");
  }

  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });
    const allBuckets = await db.query.buckets.findMany();
    const allObjects = await db.query.objects.findMany();
    const allRollups = await db.query.usageDailyRollups.findMany();

    const totalStorageProxiedBytes = allObjects.reduce((acc, o) => acc + (o.sizeBytes || 0), 0);
    const totalBandwidthTransferredBytes = allRollups.reduce((acc, r) => acc + (r.bytesUploaded + r.bytesDownloaded), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRollups = allRollups.filter((r) => r.date === todayStr);
    const totalRequestsToday = todayRollups.reduce((acc, r) => acc + r.requestCount, 0);

    // Per-user breakdown
    const userStats = allUsers.map((u) => {
      const uBuckets = allBuckets.filter((b) => b.userId === u.id);
      const uBucketIds = uBuckets.map((b) => b.id);
      const uObjects = allObjects.filter((o) => uBucketIds.includes(o.bucketId));
      const uStorageBytes = uObjects.reduce((acc, o) => acc + (o.sizeBytes || 0), 0);
      const uRollups = allRollups.filter((r) => r.userId === u.id);
      const uBandwidth = uRollups.reduce((acc, r) => acc + (r.bytesUploaded + r.bytesDownloaded), 0);
      const uRequests = uRollups.reduce((acc, r) => acc + r.requestCount, 0);

      return {
        id: u.id,
        email: u.email,
        plan: u.plan,
        createdAt: u.createdAt,
        bucketCount: uBuckets.length,
        objectCount: uObjects.length,
        storageBytes: uStorageBytes,
        bandwidthBytes: uBandwidth,
        requestCount: uRequests,
      };
    });

    return NextResponse.json({
      platformTotals: {
        totalUsers: allUsers.length,
        totalBuckets: allBuckets.length,
        totalObjects: allObjects.length,
        totalStorageProxiedBytes,
        totalBandwidthTransferredBytes,
        totalRequestsToday,
      },
      userBreakdowns: userStats,
    });
  } catch (err) {
    console.error("[AdminStats] Error:", err);
    return errorResponse("InternalError", "Failed to retrieve platform stats");
  }
}
