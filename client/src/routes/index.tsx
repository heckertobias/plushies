import SummaryCard from "@/components/summaryCard";
import { api } from "@/lib/api";
import { GROUP_ORDER, groupPlushies } from "@/lib/groupPlushies";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";

export const Route = createFileRoute("/")({
  loader: () => api.list(),
  component: Index,
});

function Index() {
  const plushies = Route.useLoaderData();
  const today = dayjs();
  const groups = groupPlushies(plushies, today);

  if (plushies.length === 0) {
    return (
      <div className="p-6 text-muted-foreground">
        Noch keine Plüschtiere angelegt.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {GROUP_ORDER.map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        return (
          <section key={group}>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              {group}
            </h2>
            <div className="flex flex-col gap-3">
              {items.map((p) => (
                <SummaryCard
                  key={p.id}
                  name={p.name}
                  birthday={dayjs(p.birthday)}
                  avatarUrl={p.photoPath ? `/uploads/${p.photoPath.split("/").pop()}` : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
