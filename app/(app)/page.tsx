import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { groupPlushies } from "@/lib/groupPlushies";
import PlushieListClient from "@/components/plushieListClient";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const all = await db.select().from(plushies);
  const groups = groupPlushies(all, dayjs());

  return <PlushieListClient groups={groups} />;
}
