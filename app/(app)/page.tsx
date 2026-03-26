import { db } from "@/lib/db";
import { plushies } from "@/lib/schema";
import { groupPlushies } from "@/lib/groupPlushies";
import PlushieListClient from "@/components/plushieListClient";
import dayjs from "dayjs";

// This is a React Server Component — it fetches data directly from the DB,
// no client-side fetch or API call needed.
export default async function Page() {
  const all = await db.select().from(plushies);
  const groups = groupPlushies(all, dayjs());

  return <PlushieListClient groups={groups} />;
}
