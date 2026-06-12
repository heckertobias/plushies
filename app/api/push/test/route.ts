import { NextResponse } from "next/server";
import { sendBadgePushToAll } from "@/lib/push";

// Triggers an immediate badge push to all subscriptions (also on days without birthdays).
// Useful for testing without waiting for the daily scheduler.
export async function POST() {
  const result = await sendBadgePushToAll({ sendWhenEmpty: true });
  return NextResponse.json(result);
}
