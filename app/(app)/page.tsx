import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { groupPlushies } from "@/lib/groupPlushies";
import PlushieListClient from "@/components/plushieListClient";
import BadgeManager from "@/components/badgeManager";
import { parseTags } from "@/lib/utils";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const all = await db.select().from(plushies);
  const groups = groupPlushies(all, dayjs());
  const allNames = all.map((p) => p.name);
  const allTags = [...new Set(all.flatMap((p) => parseTags(p.tags)))].sort();

  // VAPID_PUBLIC_KEY is read at request time (not baked in at build), which is correct for
  // a standalone Docker image where env vars are injected at runtime.
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";

  return (
    <>
      <BadgeManager vapidPublicKey={vapidPublicKey} />
      <PlushieListClient groups={groups} allPlushies={all} allNames={allNames} allTags={allTags} />
    </>
  );
}
