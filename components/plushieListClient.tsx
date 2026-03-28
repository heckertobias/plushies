"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SummaryCard from "@/components/summaryCard";
import PlushieForm from "@/components/plushieForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, X } from "lucide-react";
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

function avatarInitials(name: string): string {
  if (!name.length) return "";
  const parts = name.split(/\s+/).map((p) => p[0] ?? "");
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return (first + last).toUpperCase();
}

type ExpandState = {
  plushie: Plushie;
  origin: { top: number; left: number; width: number; height: number };
  target: { top: number; left: number; width: number; height: number; borderRadius: number };
};

type Props = { groups: GroupedPlushies };

export default function PlushieListClient({ groups }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Plushie | undefined>();
  const [expand, setExpand] = useState<ExpandState | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isEmpty = GROUP_ORDER.every((g) => groups[g].length === 0);

  function handleSaved() {
    setFormOpen(false);
    setSelected(undefined);
    startTransition(() => router.refresh());
  }

  function openDetail(p: Plushie, e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;

    let target: ExpandState["target"];
    if (isMobile) {
      target = { top: 0, left: 0, width: vw, height: vh, borderRadius: 0 };
    } else {
      const w = Math.min(480, vw - 48);
      const h = Math.min(600, vh - 80);
      target = {
        top: Math.round((vh - h) / 2),
        left: Math.round((vw - w) / 2),
        width: w,
        height: h,
        borderRadius: 16,
      };
    }

    setExpand({
      plushie: p,
      origin: { top: r.top, left: r.left, width: r.width, height: r.height },
      target,
    });
    setIsOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsOpen(true)));
  }

  function closeDetail() {
    setIsOpen(false);
    setTimeout(() => setExpand(null), 380);
  }

  function openEdit(p: Plushie) {
    closeDetail();
    setTimeout(() => {
      setSelected(p);
      setFormOpen(true);
    }, 380);
  }

  const TRANSITION = "top 0.38s cubic-bezier(0.34,1.1,0.64,1), left 0.38s cubic-bezier(0.34,1.1,0.64,1), width 0.38s cubic-bezier(0.34,1.1,0.64,1), height 0.38s cubic-bezier(0.34,1.1,0.64,1), border-radius 0.38s ease";

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((p) => (
                    <SummaryCard
                      key={p.id}
                      name={p.name}
                      birthday={birthdayLabel(p.birthday)}
                      avatarUrl={p.photoPath ? photoUrl(p.photoPath) : undefined}
                      onClick={(e) => openDetail(p, e)}
                      editButton={
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
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

      {/* ── Card-Expand Overlay ── */}
      {expand && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.35s ease" }}
            onClick={closeDetail}
          />

          {/* Expanding card */}
          <div
            className="fixed z-50 overflow-hidden bg-muted border border-border shadow-2xl"
            style={{
              top: isOpen ? expand.target.top : expand.origin.top,
              left: isOpen ? expand.target.left : expand.origin.left,
              width: isOpen ? expand.target.width : expand.origin.width,
              height: isOpen ? expand.target.height : expand.origin.height,
              borderRadius: isOpen ? expand.target.borderRadius : 12,
              transition: TRANSITION,
            }}
          >
            {/* === Expanded content (fades in after card grows) === */}
            <div
              className="absolute inset-0 flex flex-col overflow-y-auto"
              style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.18s ease 0.22s" }}
            >
              {/* Hero image */}
              <div className="relative w-full shrink-0 bg-muted-foreground/10 overflow-hidden" style={{ height: "45%" }}>
                {expand.plushie.photoPath ? (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-50"
                      style={{ backgroundImage: `url(${photoUrl(expand.plushie.photoPath)})` }}
                    />
                    <div className="absolute inset-0 bg-black/5" />
                    <img
                      src={photoUrl(expand.plushie.photoPath)}
                      alt={expand.plushie.name}
                      className="relative h-full w-full object-contain"
                    />
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-7xl font-bold text-muted-foreground/30 select-none">
                      {avatarInitials(expand.plushie.name) || "?"}
                    </span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto">
                <div>
                  <h2 className="text-2xl font-semibold leading-tight">{expand.plushie.name}</h2>
                  <p className="text-muted-foreground text-sm mt-0.5">{birthdayLabel(expand.plushie.birthday)}</p>
                </div>

                {expand.plushie.origin && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Herkunft</p>
                    <p className="text-sm mt-0.5">{expand.plushie.origin}</p>
                  </div>
                )}

                {expand.plushie.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notizen</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{expand.plushie.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* === Card header preview (fades out as card expands) === */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: isOpen ? 0 : 1, transition: "opacity 0.15s ease" }}
            >
              {expand.plushie.photoPath && (
                <div
                  className="absolute inset-0 bg-cover bg-center scale-110 blur-md opacity-45"
                  style={{ backgroundImage: `url(${photoUrl(expand.plushie.photoPath)})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-background/20" />
              <div className="relative flex items-center h-24 px-4 gap-4">
                <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-muted-foreground/20 flex items-center justify-center text-lg font-bold text-foreground/70">
                  {expand.plushie.photoPath ? (
                    <img src={photoUrl(expand.plushie.photoPath)} alt={expand.plushie.name} className="h-full w-full object-cover" />
                  ) : (
                    avatarInitials(expand.plushie.name) || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold leading-tight truncate">{expand.plushie.name}</h3>
                  <p className="text-muted-foreground text-sm">{birthdayLabel(expand.plushie.birthday)}</p>
                </div>
              </div>
            </div>

            {/* Buttons — always on top */}
            <div
              className="absolute top-3 right-3 flex gap-2 z-10"
              style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.18s ease 0.22s" }}
            >
              <button
                type="button"
                onClick={() => openEdit(expand.plushie)}
                className="rounded-full bg-black/40 hover:bg-black/60 p-1.5 text-white transition-colors"
                aria-label="Bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full bg-black/40 hover:bg-black/60 p-1.5 text-white transition-colors"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

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
