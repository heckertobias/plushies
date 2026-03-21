import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">Plüschie-Kalender</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  ),
});
