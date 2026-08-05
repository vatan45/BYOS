import { NextResponse } from "next/server";
import { registry } from "@/lib/storage/provider";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    provider_registry: registry.list(),
  });
}
