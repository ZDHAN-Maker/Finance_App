import type { ReactNode } from "react";
import { BottomNav, SideNav } from "./BottomNav";

export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-paper">
      <SideNav />
      <div className="md:pl-56">
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
          {title && (
            <h1 className="mb-5 font-display text-2xl font-semibold text-ink">{title}</h1>
          )}
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
