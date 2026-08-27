import { monthKeyLabel, shiftMonthKey } from "../utils/formatDate";
import { IconChevronLeft, IconChevronRight } from "./Icons";

export function MonthPicker({ monthKey, onChange }: { monthKey: string; onChange: (next: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-paper-line bg-paper-card px-1 py-1">
      <button
        onClick={() => onChange(shiftMonthKey(monthKey, -1))}
        aria-label="Bulan sebelumnya"
        className="rounded-md p-1.5 text-ink-soft hover:bg-paper-line/60"
      >
        <IconChevronLeft width={16} height={16} />
      </button>
      <span className="min-w-[9.5rem] text-center text-sm font-medium capitalize text-ink">
        {monthKeyLabel(monthKey)}
      </span>
      <button
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        aria-label="Bulan berikutnya"
        className="rounded-md p-1.5 text-ink-soft hover:bg-paper-line/60"
      >
        <IconChevronRight width={16} height={16} />
      </button>
    </div>
  );
}
