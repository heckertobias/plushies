import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Plüschie-Kalender",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="min-h-screen bg-background">
          <header className="border-b bg-card">
            <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
              <span className="text-3xl leading-none" aria-hidden="true">🧸</span>
              <div>
                <h1 className="text-lg font-bold leading-tight">Plüschie-Kalender</h1>
                <p className="text-xs text-muted-foreground leading-tight">Geburtstage im Blick</p>
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
