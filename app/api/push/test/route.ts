import { NextResponse } from "next/server";
import { sendBadgePushToAll } from "@/lib/push";

// Triggers an immediate badge push to all subscriptions.
// Useful for testing without waiting for midnight.
export async function POST() {
  await sendBadgePushToAll();
  return NextResponse.json({ ok: true });
}
