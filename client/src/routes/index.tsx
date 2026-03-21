import { useState } from "react";
import SummaryCard from "@/components/summaryCard";
import PlushieForm from "@/components/plushieForm";
import { Button } from "@/components/ui/button";
import { api, type Plushie } from "@/lib/api";
import { GROUP_ORDER, groupPlushies } from "@/lib/groupPlushies";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: () => api.list(),
  component: Index,
});

function Index() {
  const plushies = Route.useLoaderData();
  const router = useRouter();
  const today = dayjs();
  const groups = groupPlushies(plushies, today);

  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Plushie | undefined>(undefined);

  function openCreate() {
    setSelected(undefined);
    setFormOpen(true);
  }

  function openEdit(p: Plushie) {
    setSelected(p);
    setFormOpen(true);
  }

  function handleClose() {
    setFormOpen(false);
    setSelected(undefined);
  }

  async function handleSaved() {
    setFormOpen(false);
    setSelected(undefined);
    await router.invalidate();
  }

  return (
    <>
      <div className="p-6 space-y-8">
        <div className="flex justify-end">
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            Neu
          </Button>
        </div>

        {plushies.length === 0 ? (
          <p className="text-muted-foreground">Noch keine Plüschtiere angelegt.</p>
        ) : (
          GROUP_ORDER.map((group) => {
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
                      avatarUrl={
                        p.photoPath ? `/uploads/${p.photoPath.split("/").pop()}` : undefined
                      }
                      onClick={() => openEdit(p)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      <PlushieForm
        open={formOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        plushie={selected}
      />
    </>
  );
}
