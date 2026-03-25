"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SummaryCard from "@/components/summaryCard";
import PlushieForm from "@/components/plushieForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { GROUP_ORDER, type GroupedPlushies } from "@/lib/groupPlushies";
import type { Plushie } from "@/lib/schema";
import dayjs from "dayjs";

type Props = { groups: GroupedPlushies };

export default function PlushieListClient({ groups }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Plushie | undefined>();

  const isEmpty = GROUP_ORDER.every((g) => groups[g].length === 0);

  function handleSaved() {
    setFormOpen(false);
    setSelected(undefined);
    // router.refresh() re-runs the Server Component on the server and streams
    // the updated HTML — no full page reload needed.
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="p-6 space-y-8">
        <div className="flex justify-end">
          <Button onClick={() => { setSelected(undefined); setFormOpen(true); }} size="sm">
            <Plus className="h-4 w-4" />
            Neu
          </Button>
        </div>

        {isEmpty ? (
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
                      birthday={dayjs(p.birthday).format("DD.MM.YYYY")}
                      avatarUrl={p.photoPath ? `/api/uploads/${p.photoPath.split("/").pop()}` : undefined}
                      origin={p.origin}
                      notes={p.notes}
                      editButton={
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelected(p); setFormOpen(true); }}
                          className="rounded-full p-1.5 hover:bg-accent transition-colors cursor-pointer"
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      <PlushieForm
        key={selected?.id ?? "new"}
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelected(undefined); }}
        onSaved={handleSaved}
        plushie={selected}
      />
    </>
  );
}
