import { useState } from "react";
import { Modal } from "./Modal";
import type { Category, Transaction, TransactionType } from "../types";
import { todayDateInputValue } from "../utils/formatDate";
import type { TransactionInput } from "../hooks/useTransactions";

interface Props {
  categories: Category[];
  initial?: Transaction | null;
  onSubmit: (input: TransactionInput) => Promise<unknown>;
  onClose: () => void;
}

export function TransactionFormModal({ categories, initial, onSubmit, onClose }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [date, setDate] = useState(initial?.transaction_date ?? todayDateInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Nominal harus berupa angka positif.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: numericAmount,
        description: description.trim(),
        category_id: categoryId || null,
        transaction_date: date,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={initial ? "Edit transaksi" : "Tambah transaksi"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as TransactionType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                type === t
                  ? t === "expense"
                    ? "border-rust-500 bg-rust-50 text-rust-600"
                    : "border-ledger-500 bg-ledger-50 text-ledger-600"
                  : "border-paper-line text-ink-soft"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Nominal (Rp)</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="30000"
            className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm tabular-nums focus:border-ledger-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Kategori</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
          >
            <option value="">Tanpa kategori</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Keterangan</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder="Contoh: bensin"
            className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Tanggal</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
          />
        </div>

        {error && <p className="text-sm text-rust-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-ledger-500 py-2.5 text-sm font-semibold text-white hover:bg-ledger-600 disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}
