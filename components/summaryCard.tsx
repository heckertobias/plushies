import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  name: string;
  birthday: string;
  avatarUrl?: string;
  origin?: string | null;
  notes?: string | null;
  editButton: ReactNode;
};

function avatarInitials(name: string): string {
  if (!name.length) return "";
  const parts = name.split(/\s+/).map((p) => p[0] ?? "");
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return (first + last).toUpperCase();
}

export default function SummaryCard({ name, birthday, avatarUrl, origin, notes, editButton }: Props) {
  const hasDetails = !!(origin || notes);

  return (
    <details className="group relative rounded-xl overflow-hidden border border-border bg-muted">
      <summary className="relative flex items-center h-24 px-4 gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {/* Blurred background image */}
        {avatarUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-md opacity-45"
            style={{ backgroundImage: `url(${avatarUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-background/20" />

        {/* Avatar */}
        <div className="relative h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-muted-foreground/20 flex items-center justify-center text-lg font-bold text-foreground/70">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            avatarInitials(name) || "?"
          )}
        </div>

        {/* Name + birthday */}
        <div className="relative flex-1 min-w-0">
          <h3 className="text-xl font-semibold leading-tight truncate">{name}</h3>
          <p className="text-muted-foreground text-sm">{birthday}</p>
        </div>

        {/* Chevron + edit */}
        <div className="relative flex items-center gap-2 shrink-0">
          {hasDetails && (
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          )}
          {editButton}
        </div>
      </summary>

      {hasDetails && (
        <div className="relative px-4 pb-4 pt-1 space-y-2">
          {origin && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Herkunft</p>
              <p className="text-sm">{origin}</p>
            </div>
          )}
          {notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notizen</p>
              <p className="text-sm whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
