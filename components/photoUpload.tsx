"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// "delete" = bestehendes Server-Foto soll gelöscht werden
// File     = neues Foto hochladen
// null     = keine Änderung
export type PhotoChange = File | "delete" | null;

type Props = {
  currentPhotoUrl?: string;
  onChange: (value: PhotoChange) => void;
};

export default function PhotoUpload({ currentPhotoUrl, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);
  const [isExisting, setIsExisting] = useState(!!currentPhotoUrl);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setIsExisting(false);
    onChange(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    // Bestehendes Server-Foto → explizit löschen; neue Auswahl → einfach zurücksetzen
    onChange(isExisting ? "delete" : null);
    setIsExisting(false);
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors select-none",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="Vorschau" className="max-h-40 rounded object-contain" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <p className="text-sm">
              Foto hierher ziehen oder <span className="text-primary underline-offset-2 hover:underline">auswählen</span>
            </p>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full md:hidden"
        onClick={() => cameraRef.current?.click()}
      >
        <Camera className="h-4 w-4" />
        Kamera öffnen
      </Button>
    </div>
  );
}
