import type { ReactNode } from "react";
import { IconX } from "./Icons";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
      <button
        aria-label="Tutup"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-card border border-paper-line bg-paper-card p-5 shadow-card sm:max-w-md sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1.5 text-ink-faint hover:bg-paper-line/60 hover:text-ink"
          >
            <IconX width={18} height={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
