import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plüschie-Kalender",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="min-h-screen bg-background">
          <header className="border-b px-6 py-4">
            <h1 className="text-xl font-bold">Plüschie-Kalender</h1>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
