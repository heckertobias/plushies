import { NextResponse } from "next/server";
import { getBadgeStatus } from "@/lib/push";

// Diagnostic snapshot for the in-app "test push" UI – lets the user see on-device
// which layer (VAPID config, subscription, scheduler) is working without checking server logs.
export async function GET() {
  const status = await getBadgeStatus();
  return NextResponse.json(status);
}
