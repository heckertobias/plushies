"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { type FilterState, EMPTY_FILTER } from "@/lib/search";

interface Props {
  open: boolean;
  onClose: () => void;
  allTags: string[];
  filters: FilterState;
  onApply: (f: FilterState) => void;
}

export default function FilterDialog({ open, onClose, allTags, filters, onApply }: Props) {
  const [draft, setDraft] = useState<FilterState>(filters);

  function handleOpenChange(o: boolean) {
    if (o) setDraft(filters);
    else onClose();
  }

  function handleOpen() {
    setDraft(filters);
  }

  function toggleTag(tag: string) {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));
  }

  function apply() {
    onApply(draft);
    onClose();
  }

  function reset() {
    setDraft(EMPTY_FILTER);
    onApply(EMPTY_FILTER);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={() => handleOpen()}>
        <DialogHeader>
          <DialogTitle>Filtern</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="z. B. Bärli"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = draft.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-transparent hover:border-border"
                      }`}
                    >
                      {tag}
                      {active && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day/month range */}
          <div className="space-y-1.5">
            <Label>Tag · Monat</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="TT.MM"
                maxLength={5}
                value={draft.dayMonthFrom}
                onChange={(e) => setDraft((d) => ({ ...d, dayMonthFrom: e.target.value }))}
                className="w-28 tabular-nums"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                placeholder="TT.MM"
                maxLength={5}
                value={draft.dayMonthTo}
                onChange={(e) => setDraft((d) => ({ ...d, dayMonthTo: e.target.value }))}
                className="w-28 tabular-nums"
              />
            </div>
          </div>

          {/* Year range */}
          <div className="space-y-1.5">
            <Label>Jahrgang</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Von"
                min={1900}
                max={new Date().getFullYear()}
                value={draft.yearFrom}
                onChange={(e) => setDraft((d) => ({ ...d, yearFrom: e.target.value }))}
                className="w-28"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                placeholder="Bis"
                min={1900}
                max={new Date().getFullYear()}
                value={draft.yearTo}
                onChange={(e) => setDraft((d) => ({ ...d, yearTo: e.target.value }))}
                className="w-28"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={reset} className="mr-auto">
            Zurücksetzen
          </Button>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={apply}>Anwenden</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
