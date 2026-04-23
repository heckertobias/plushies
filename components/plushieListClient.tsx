"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import SummaryCard from "@/components/summaryCard";
import PlushieForm from "@/components/plushieForm";
import SearchBar from "@/components/searchBar";
import FilterDialog from "@/components/filterDialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, X, RefreshCw } from "lucide-react";
import LogoutButton from "@/components/logoutButton";
import { GROUP_ORDER, nextBirthday, groupPlushies, type GroupedPlushies, type Group } from "@/lib/groupPlushies";
import type { Plushie } from "@/lib/schema";
import { searchPlushies, filterPlushies, type FilterState, EMPTY_FILTER, activeFilterCount, isFilterActive } from "@/lib/search";
import dayjs from "dayjs";
import { photoUrl, parseTags } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 250;

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

type Props = { groups: GroupedPlushies; allPlushies: Plushie[]; allNames: string[]; allTags: string[] };

export default function PlushieListClient({ groups, allPlushies, allNames, allTags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selected, setSelected] = useState<Plushie | undefined>();
  const [expand, setExpand] = useState<ExpandState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const { pullDistance, isPulling } = usePullToRefresh({
    onRefresh: handleRefresh,
    isRefreshing: isPending,
    enabled: !expand && !formOpen,
  });

  // Search & filter state
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, filters]);

  // Auto-reload when PWA is brought back to foreground
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  // Derive active display list
  const isSearching = debouncedQuery.trim().length > 0;
  const filtering = isFilterActive(filters);
  const filterCount = activeFilterCount(filters);

  let flatSearchResults: Plushie[] | null = null;
  let filteredGroups: GroupedPlushies | null = null;

  if (isSearching) {
    const base = filtering ? filterPlushies(allPlushies, filters) : allPlushies;
    flatSearchResults = searchPlushies(debouncedQuery, base);
  } else if (filtering) {
    const filtered = filterPlushies(allPlushies, filters);
    filteredGroups = groupPlushies(filtered, dayjs());
  }

  // Build flat list for infinite scroll
  const activeGroups: GroupedPlushies = filteredGroups ?? groups;
  const flatList: { group: Group; plushie: Plushie }[] = flatSearchResults
    ? flatSearchResults.map((p) => ({ group: "Später" as Group, plushie: p }))
    : GROUP_ORDER.flatMap((g) => activeGroups[g].map((p) => ({ group: g, plushie: p })));

  const totalCount = flatList.length;
  const visibleFlat = flatList.slice(0, visibleCount);

  const visibleGroups = GROUP_ORDER.reduce<Partial<Record<Group, Plushie[]>>>((acc, g) => {
    const items = visibleFlat.filter((x) => x.group === g).map((x) => x.plushie);
    if (items.length > 0) acc[g] = items;
    return acc;
  }, {});

  const visibleSearchResults = flatSearchResults ? visibleFlat.map((x) => x.plushie) : null;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && visibleCount < totalCount) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, totalCount));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, totalCount]);

  const isEmpty = totalCount === 0;
  const baseIsEmpty = allPlushies.length === 0;

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

  function renderCard(p: Plushie) {
    return (
      <SummaryCard
        key={p.id}
        name={p.name}
        birthday={birthdayLabel(p.birthday)}
        avatarUrl={p.photoPath ? photoUrl(p.photoPath) : undefined}
        onClick={(e) => openDetail(p, e)}
      />
    );
  }

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-card border-b safe-top">
        {/* Desktop: single row — logo | search+filter | neu | logout */}
        <div className="hidden sm:flex max-w-7xl mx-auto px-6 py-3 items-center gap-4">
          <span className="text-2xl leading-none shrink-0" aria-hidden="true">🧸</span>
          <div className="shrink-0">
            <h1 className="text-sm font-bold leading-tight">Plüschie-Kalender</h1>
            <p className="text-xs text-muted-foreground leading-tight">Geburtstage im Blick</p>
          </div>
          <div className="flex-1">
            <SearchBar
              value={rawQuery}
              onChange={setRawQuery}
              onFilterClick={() => setFilterOpen(true)}
              activeFilterCount={filterCount}
            />
          </div>
          <Button onClick={() => { setSelected(undefined); setFormKey(k => k + 1); setFormOpen(true); }} size="sm">
            <Plus className="h-4 w-4" />
            Neu
          </Button>
          <LogoutButton />
        </div>

        {/* Mobile: two rows — logo+logout / search+filter */}
        <div className="sm:hidden">
          <div className="px-6 py-4 flex items-center gap-3">
            <span className="text-3xl leading-none" aria-hidden="true">🧸</span>
            <div className="flex-1">
              <h1 className="text-lg font-bold leading-tight">Plüschie-Kalender</h1>
              <p className="text-xs text-muted-foreground leading-tight">Geburtstage im Blick</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startTransition(() => router.refresh())}
              aria-label="Neu laden"
              title="Neu laden"
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 transition-transform ${isPending ? "animate-spin" : ""}`} />
            </Button>
            <LogoutButton />
          </div>
          <div className="px-6 pb-3">
            <SearchBar
              value={rawQuery}
              onChange={setRawQuery}
              onFilterClick={() => setFilterOpen(true)}
              activeFilterCount={filterCount}
            />
          </div>
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {(isPulling || isPending) && (
        <div
          className="flex items-end justify-center overflow-hidden transition-[height] duration-300"
          style={{ height: isPulling ? pullDistance : isPending ? 48 : 0 }}
        >
          <RefreshCw
            className={`h-5 w-5 mb-2 text-muted-foreground ${isPending ? "animate-spin" : ""}`}
            style={{
              transform: isPulling ? `rotate(${pullDistance * 4}deg)` : undefined,
              opacity: Math.min(pullDistance / 48, 1),
            }}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Result count when searching/filtering */}
        {(isSearching || filtering) && (
          <p className="text-sm text-muted-foreground -mt-2">
            {totalCount === 0
              ? "Keine Ergebnisse"
              : `${totalCount} ${totalCount === 1 ? "Ergebnis" : "Ergebnisse"}`}
          </p>
        )}

        {baseIsEmpty ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">🧸</span>
            <p className="text-muted-foreground">Noch keine Plüschtiere angelegt.<br />Leg gleich los!</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-muted-foreground">Kein Plüschtier gefunden.</p>
          </div>
        ) : isSearching && visibleSearchResults ? (
          // Flat search results (no group headers)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleSearchResults.map(renderCard)}
          </div>
        ) : (
          // Grouped view (normal or filtered)
          <>
            {GROUP_ORDER.map((group) => {
              const items = visibleGroups[group];
              if (!items || items.length === 0) return null;
              return (
                <section key={group}>
                  <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">
                    {group}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {items.map(renderCard)}
                  </div>
                </section>
              );
            })}
          </>
        )}

        <div ref={sentinelRef} />
      </div>

      {/* Floating action button — mobile only */}
      <Button
        onClick={() => { setSelected(undefined); setFormKey(k => k + 1); setFormOpen(true); }}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden safe-bottom-margin"
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
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {(() => {
                      const bd = dayjs(expand.plushie.birthday);
                      const age = dayjs().diff(bd, "year");
                      return `${bd.format("DD.MM.YYYY")} · ${age} Jahre`;
                    })()}
                  </p>
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

                {parseTags(expand.plushie.tags).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {parseTags(expand.plushie.tags).map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
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
                className="rounded-full bg-black/40 hover:bg-black/60 p-1.5 text-white transition-colors cursor-pointer"
                aria-label="Bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full bg-black/40 hover:bg-black/60 p-1.5 text-white transition-colors cursor-pointer"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <FilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        allTags={allTags}
        filters={filters}
        onApply={setFilters}
      />

      <PlushieForm
        key={selected ? `edit-${selected.id}` : `new-${formKey}`}
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelected(undefined); }}
        onSaved={handleSaved}
        plushie={selected}
        existingNames={allNames}
        allTags={allTags}
      />
    </>
  );
}
