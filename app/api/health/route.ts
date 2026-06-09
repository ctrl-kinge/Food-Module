import { NextResponse } from "next/server";

// Simple liveness check so we can confirm API routing works in Phase 0.
export async function GET() {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}
