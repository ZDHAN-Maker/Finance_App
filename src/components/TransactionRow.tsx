import type { Transaction } from "../types";
import { categoryNameOf } from "../types";
import { formatSignedRupiah } from "../utils/formatCurrency";
import { formatDateID } from "../utils/formatDate";
import { IconEdit, IconTrash, IconSend } from "./Icons";

interface Props {
  transaction: Transaction;
  showDate?: boolean;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}

export function TransactionRow({ transaction, showDate = false, onEdit, onDelete }: Props) {
  const categoryName = categoryNameOf(transaction) ?? "Tanpa kategori";
  const isIncome = transaction.type === "income";

  return (
    <div className="group flex items-center gap-3 border-b border-paper-line/70 py-3 last:border-0">
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          isIncome ? "bg-ledger-50 text-ledger-600" : "bg-rust-50 text-rust-500"
        }`}
      >
        {isIncome ? "+" : "-"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{transaction.description || categoryName}</p>
        <p className="flex items-center gap-1 text-xs text-ink-faint">
          {categoryName}
          {showDate && <span>· {formatDateID(transaction.transaction_date)}</span>}
          {transaction.source === "telegram" && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-ledger-500">
              <IconSend width={11} height={11} />
            </span>
          )}
        </p>
      </div>

      <p className={`font-mono text-sm font-semibold tabular-nums ${isIncome ? "text-ledger-600" : "text-rust-500"}`}>
        {formatSignedRupiah(transaction.amount, transaction.type)}
      </p>

      {(onEdit || onDelete) && (
        <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              aria-label="Edit transaksi"
              className="rounded-md p-1.5 text-ink-faint hover:bg-paper-line/60 hover:text-ink"
            >
              <IconEdit width={15} height={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction)}
              aria-label="Hapus transaksi"
              className="rounded-md p-1.5 text-ink-faint hover:bg-rust-50 hover:text-rust-500"
            >
              <IconTrash width={15} height={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
