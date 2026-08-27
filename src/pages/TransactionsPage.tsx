import { useState } from "react";
import { Layout } from "../components/Layout";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionRow } from "../components/TransactionRow";
import { TransactionFormModal } from "../components/TransactionFormModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { IconPlus, IconSearch } from "../components/Icons";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { currentMonthKey } from "../utils/formatDate";
import type { Transaction } from "../types";

export function TransactionsPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { categories } = useCategories();
  const { transactions, loading, createTransaction, updateTransaction, deleteTransaction } = useTransactions({
    month: monthKey,
    categoryId: categoryId || undefined,
    search: search || undefined,
  });

  async function handleDelete() {
    if (!deleting) return;
    await deleteTransaction(deleting.id);
    setDeleting(null);
  }

  return (
    <Layout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Riwayat</h1>
        <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi..."
            className="w-full rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-3 text-sm focus:border-ledger-500"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-paper-line bg-paper-card px-3 py-2 text-sm focus:border-ledger-500"
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type === "income" ? "masuk" : "keluar"})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-card border border-paper-line bg-paper-card px-4">
        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-4">
            <EmptyState
              title="Tidak ada transaksi"
              description="Coba ubah filter, atau tambah transaksi baru lewat tombol di bawah."
            />
          </div>
        ) : (
          transactions.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              showDate
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))
        )}
      </div>

      <button
        onClick={() => setShowAddForm(true)}
        aria-label="Tambah transaksi"
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-ledger-500 text-white shadow-card hover:bg-ledger-600 md:bottom-8 md:right-8"
      >
        <IconPlus width={22} height={22} />
      </button>

      {showAddForm && (
        <TransactionFormModal
          categories={categories}
          onSubmit={createTransaction}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editing && (
        <TransactionFormModal
          categories={categories}
          initial={editing}
          onSubmit={(input) => updateTransaction(editing.id, input)}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Hapus transaksi?"
          description={`Transaksi "${deleting.description || "tanpa keterangan"}" akan dihapus permanen.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Layout>
  );
}
