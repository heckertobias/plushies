"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SummaryCard from "@/components/summaryCard";
import PlushieForm from "@/components/plushieForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { GROUP_ORDER, nextBirthday, type GroupedPlushies } from "@/lib/groupPlushies";
import type { Plushie } from "@/lib/schema";
import dayjs from "dayjs";
import { photoUrl } from "@/lib/utils";

function birthdayLabel(rawDate: string): string {
  const today = dayjs().startOf("day");
  const next = nextBirthday(rawDate, today);
  const diff = next.diff(today, "day");
  if (diff === 0) return "🎂 Heute!";
  if (diff === 1) return "🎂 Morgen";
  if (diff <= 30) return `🎂 in ${diff} Tagen`;
  return `🎂 ${next.format("DD.MM.")}`;
}

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
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">
        <div className="hidden sm:flex justify-end">
          <Button onClick={() => { setSelected(undefined); setFormOpen(true); }} size="sm">
            <Plus className="h-4 w-4" />
            Neu
          </Button>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">🧸</span>
            <p className="text-muted-foreground">Noch keine Plüschtiere angelegt.<br />Leg gleich los!</p>
          </div>
        ) : (
          GROUP_ORDER.map((group) => {
            const items = groups[group];
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">
                  {group}
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map((p) => (
                    <SummaryCard
                      key={p.id}
                      name={p.name}
                      birthday={birthdayLabel(p.birthday)}
                      avatarUrl={p.photoPath ? photoUrl(p.photoPath) : undefined}
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

      {/* Floating action button — mobile only */}
      <Button
        onClick={() => { setSelected(undefined); setFormOpen(true); }}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden"
        aria-label="Neues Plüschtier"
      >
        <Plus className="h-6 w-6" />
      </Button>

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
