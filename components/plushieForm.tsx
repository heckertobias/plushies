"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Plushie } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import PhotoUpload, { type PhotoChange } from "@/components/photoUpload";
import DatePicker from "@/components/datePicker";
import { photoUrl } from "@/lib/utils";

type PlushieInput = {
  name: string;
  birthday: string;
  origin?: string;
  notes?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  plushie?: Plushie;
};

async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export default function PlushieForm({ open, onClose, onSaved, plushie }: Props) {
  const isEdit = !!plushie;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoChange>(null);
  const [birthday, setBirthday] = useState(plushie?.birthday ?? "");

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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Plüschtier bearbeiten" : "Neues Plüschtier"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={plushie?.name} placeholder="z.B. Bärchi" />
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
            <Label>Foto</Label>
            <PhotoUpload
              currentPhotoUrl={plushie?.photoPath ? photoUrl(plushie.photoPath) : undefined}
              onChange={setPhoto}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            {isEdit && !confirmDelete && (
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={deleting || saving}>
                Löschen
              </Button>
            )}
            {isEdit && confirmDelete && (
              <>
                <span className="text-sm text-muted-foreground self-center">Wirklich löschen?</span>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Löschen…" : "Ja, löschen"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Abbrechen
                </Button>
              </>
            )}
            {!confirmDelete && (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={saving || deleting}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={saving || deleting}>
                  {saving ? "Speichern…" : "Speichern"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
