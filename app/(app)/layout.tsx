import LogoutButton from "@/components/logoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-3xl leading-none" aria-hidden="true">🧸</span>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Plüschie-Kalender</h1>
            <p className="text-xs text-muted-foreground leading-tight">Geburtstage im Blick</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
