"use client";

import { useState } from "react";
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
import PhotoUpload from "@/components/photoUpload";
import DatePicker from "@/components/datePicker";

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
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [birthday, setBirthday] = useState(plushie?.birthday ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);

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

      if (photo) {
        const form = new FormData();
        form.append("photo", photo);
        await fetch(`/api/plushies/${saved.id}/photo`, { method: "POST", body: form });
      }

      onSaved();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
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
              currentPhotoUrl={plushie?.photoPath ? `/api/uploads/${plushie.photoPath.split("/").pop()}` : undefined}
              onChange={setPhoto}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            {isEdit && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? "Löschen…" : "Löschen"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || deleting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
