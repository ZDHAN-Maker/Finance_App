import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryBreakdownItem } from "../types";
import { formatRupiah } from "../utils/formatCurrency";

const PALETTE = ["#1F6E4A", "#2F8F5E", "#C99A2E", "#B3441F", "#8F3417", "#4B5A50", "#175939"];

export function CategoryDonutChart({ breakdown }: { breakdown: CategoryBreakdownItem[] }) {
  if (breakdown.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-ink-faint">
        Belum ada pengeluaran bulan ini.
      </div>
    );
  }

  const data = breakdown.slice(0, 6).map((item) => ({ name: item.name, value: item.amount }));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-44 w-full sm:w-44 sm:flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatRupiah(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-2">
        {breakdown.slice(0, 6).map((item, i) => (
          <li key={item.category_id ?? item.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink-soft">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              {item.name}
            </span>
            <span className="font-mono tabular-nums text-ink-faint">{item.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
