export default function AppLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t py-4 px-6 safe-bottom">
        <p className="text-center text-xs text-muted-foreground">
          © {year}{" "}
          <a
            href="https://github.com/heckertobias"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Tobias Hecker
          </a>
        </p>
      </footer>
    </div>
  );
}
