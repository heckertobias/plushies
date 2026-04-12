type Props = {
  name: string;
  birthday: string;
  avatarUrl?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

function avatarInitials(name: string): string {
  if (!name.length) return "";
  const parts = name.split(/\s+/).map((p) => p[0] ?? "");
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return (first + last).toUpperCase();
}

export default function SummaryCard({ name, birthday, avatarUrl, onClick }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)}
      className="group relative rounded-xl overflow-hidden border border-border bg-muted cursor-pointer hover:ring-2 hover:ring-ring transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Blurred background image */}
      {avatarUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-md opacity-45"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-background/20" />

      <div className="relative flex items-center h-24 px-4 gap-4">
        {/* Avatar */}
        <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-muted-foreground/20 flex items-center justify-center text-lg font-bold text-foreground/70">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            avatarInitials(name) || "?"
          )}
        </div>

        {/* Name + birthday */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold leading-tight truncate">{name}</h3>
          <p className="text-muted-foreground text-sm">{birthday}</p>
        </div>

      </div>
    </div>
  );
}
