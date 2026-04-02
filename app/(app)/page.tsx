import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { groupPlushies } from "@/lib/groupPlushies";
import PlushieListClient from "@/components/plushieListClient";
import { parseTags } from "@/lib/utils";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const all = await db.select().from(plushies);
  const groups = groupPlushies(all, dayjs());
  const allNames = all.map((p) => p.name);
  const allTags = [...new Set(all.flatMap((p) => parseTags(p.tags)))].sort();

  return <PlushieListClient groups={groups} allPlushies={all} allNames={allNames} allTags={allTags} />;
}
