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

      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ledger-600">
          Saldo saat ini
        </p>
        <p className="mt-1 break-words font-display text-2xl font-semibold tabular-nums text-ink sm:text-4xl">
          {formatRupiah(balance)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-paper-line pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Pemasukan</p>
            <p className="break-words font-mono text-[11px] font-semibold tabular-nums text-ledger-600 sm:text-sm">
              {formatRupiah(totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Pengeluaran</p>
            <p className="break-words font-mono text-[11px] font-semibold tabular-nums text-rust-500 sm:text-sm">
              {formatRupiah(totalExpense)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-ink-faint">Dicatat dari {transactionCount} transaksi</p>
      </div>
    </div>
  );
}
