import { formatRupiah } from "../utils/formatCurrency";
import { IconCoin } from "./Icons";

interface Props {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export function PassbookBalanceCard({ balance, totalIncome, totalExpense, transactionCount }: Props) {
  return (
    <div className="relative flex overflow-hidden rounded-card border border-paper-line bg-paper-card shadow-card">
      {/* Tulang punggung ala sampul buku tabungan */}
      <div className="passbook-perforation flex w-10 flex-shrink-0 items-start justify-center bg-ledger-500 pt-4">
        <IconCoin className="text-ledger-50" width={18} height={18} />
      </div>

      <div className="flex-1 p-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ledger-600">
          Saldo saat ini
        </p>
        <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-ink">
          {formatRupiah(balance)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-paper-line pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Pemasukan</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-ledger-600">
              {formatRupiah(totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Pengeluaran</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-rust-500">
              {formatRupiah(totalExpense)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-ink-faint">Dicatat dari {transactionCount} transaksi</p>
      </div>
    </div>
  );
}
