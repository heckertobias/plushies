"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Plushie } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import PhotoUpload, { type PhotoChange } from "@/components/photoUpload";
import DatePicker from "@/components/datePicker";
import TagInput from "@/components/tagInput";
import { photoUrl, parseTags } from "@/lib/utils";
import { Save, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type PlushieInput = {
  name: string;
  birthday: string;
  origin?: string;
  notes?: string;
  tags?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  plushie?: Plushie;
  existingNames?: string[];
  allTags?: string[];
};

async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export default function PlushieForm({ open, onClose, onSaved, plushie, existingNames = [], allTags = [] }: Props) {
  const isEdit = !!plushie;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoChange>(null);
  const [birthday, setBirthday] = useState(plushie?.birthday ?? "");
  const [nameValue, setNameValue] = useState(plushie?.name ?? "");
  const [tags, setTags] = useState<string[]>(parseTags(plushie?.tags));

  const isDuplicate =
    nameValue.trim().length > 0 &&
    existingNames.some(
      (n) =>
        n.trim().toLowerCase() === nameValue.trim().toLowerCase() &&
        (!isEdit || n.trim().toLowerCase() !== plushie.name.trim().toLowerCase())
    );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);

    if (!birthday) {
      setError("Bitte ein Geburtsdatum auswählen.");
      return;
    }

    const input: PlushieInput = {
      name: data.get("name") as string,
      birthday,
      origin: (data.get("origin") as string) || undefined,
      notes: (data.get("notes") as string) || undefined,
      tags,
    };

    setSaving(true);
    try {
      const saved = isEdit
        ? await apiRequest<Plushie>(`/api/plushies/${plushie.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })
        : await apiRequest<Plushie>("/api/plushies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });

      if (photo === "delete") {
        await fetch(`/api/plushies/${saved.id}/photo`, { method: "DELETE" });
      } else if (photo instanceof File) {
        const form = new FormData();
        form.append("photo", photo);
        const res = await fetch(`/api/plushies/${saved.id}/photo`, { method: "POST", body: form });
        if (!res.ok) {
          if (!isEdit) await fetch(`/api/plushies/${saved.id}`, { method: "DELETE" });
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Foto-Upload fehlgeschlagen");
        }
      }

      toast.success(isEdit ? "Gespeichert" : "Plüschtier angelegt");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!plushie) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plushies/${plushie.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Plüschtier gelöscht");
      onSaved();
    } catch {
      setError("Löschen fehlgeschlagen.");
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">

        {/* Header: title + close button */}
        <div className="flex items-center justify-between gap-2">
          <DialogTitle>
            {isEdit ? "Plüschtier bearbeiten" : "Neues Plüschtier"}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Schließen"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <form id="plushie-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              value={nameValue}
              placeholder="z.B. Bärchi"
              onChange={(e) => setNameValue(e.target.value)}
              onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
            />
            {isDuplicate && (
              <p className="text-sm text-amber-500">
                Es gibt bereits ein Tier mit diesem Namen.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Geburtstag *</Label>
            <DatePicker value={birthday} onChange={setBirthday} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="origin">Herkunft</Label>
            <Input id="origin" name="origin" defaultValue={plushie?.origin ?? ""} placeholder="z.B. Geschenk von Oma" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" name="notes" defaultValue={plushie?.notes ?? ""} placeholder="Besonderheiten, …" rows={3} />
          </div>

          <div className="space-y-1">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} suggestions={allTags} />
          </div>

          <div className="space-y-1">
            <Label>Foto</Label>
            <PhotoUpload
              currentPhotoUrl={plushie?.photoPath ? photoUrl(plushie.photoPath) : undefined}
              onChange={setPhoto}
            />
          </div>

          <DialogFooter className="gap-2">
            {isEdit && !confirmDelete && (
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                Löschen
              </Button>
            )}
            {isEdit && confirmDelete && (
              <>
                <span className="text-sm text-muted-foreground self-center">Wirklich löschen?</span>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Löschen…" : "Ja, löschen"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Abbrechen
                </Button>
              </>
            )}
            {!confirmDelete && (
              <Button type="submit" disabled={busy}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Speichern…" : "Speichern"}
              </Button>
            )}
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}
