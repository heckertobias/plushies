import { NextResponse } from "next/server";
import { sendBadgePushToAll } from "@/lib/push";

// Triggers an immediate badge push to all subscriptions.
// Useful for testing without waiting for the daily scheduler.
export async function POST() {
  const result = await sendBadgePushToAll();
  return NextResponse.json(result);
}
