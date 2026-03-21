import { useRef, useState } from "react";
import { api, type Plushie, type PlushieInput } from "@/lib/api";
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

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  plushie?: Plushie;
};

export default function PlushieForm({ open, onClose, onSaved, plushie }: Props) {
  const isEdit = !!plushie;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    const input: PlushieInput = {
      name: data.get("name") as string,
      birthday: data.get("birthday") as string,
      origin: (data.get("origin") as string) || undefined,
      notes: (data.get("notes") as string) || undefined,
    };

    setSaving(true);
    try {
      const saved = isEdit ? await api.update(plushie.id, input) : await api.create(input);

      const photo = photoRef.current?.files?.[0];
      if (photo) {
        await api.uploadPhoto(saved.id, photo);
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
      await api.delete(plushie.id);
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
            <Input
              id="name"
              name="name"
              required
              defaultValue={plushie?.name}
              placeholder="z.B. Bärchi"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="birthday">Geburtstag *</Label>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              required
              defaultValue={plushie?.birthday}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="origin">Herkunft</Label>
            <Input
              id="origin"
              name="origin"
              defaultValue={plushie?.origin ?? ""}
              placeholder="z.B. Geschenk von Oma"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={plushie?.notes ?? ""}
              placeholder="Besonderheiten, Lieblingsplatz, …"
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="photo">Foto</Label>
            <Input id="photo" name="photo" type="file" accept="image/*" ref={photoRef} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? "Löschen…" : "Löschen"}
              </Button>
            )}
            <Button type="submit" disabled={saving || deleting}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
