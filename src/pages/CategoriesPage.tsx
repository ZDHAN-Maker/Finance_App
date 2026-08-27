import { useState } from "react";
import { Layout } from "../components/Layout";
import { useCategories } from "../hooks/useCategories";
import { IconPlus, IconTrash } from "../components/Icons";
import { Modal } from "../components/Modal";
import type { TransactionType } from "../types";

function CategoryGroup({
  title,
  categories,
  onDelete,
}: {
  title: string;
  categories: { id: string; name: string; user_id: string | null }[];
  onDelete: (id: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border border-paper-line bg-paper-card px-3 py-1.5 text-sm text-ink-soft"
          >
            {c.name}
            {c.user_id && (
              <button
                onClick={() => onDelete(c.id)}
                aria-label={`Hapus kategori ${c.name}`}
                className="text-ink-faint hover:text-rust-500"
              >
                <IconTrash width={13} height={13} />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { categories, loading, createCategory, deleteCategory } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCategory(name.trim(), type);
      setName("");
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Kategori</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-ledger-500 px-3 py-2 text-sm font-medium text-white hover:bg-ledger-600"
        >
          <IconPlus width={16} height={16} />
          Tambah
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-faint">Memuat...</p>
      ) : (
        <div className="rounded-card border border-paper-line bg-paper-card p-5">
          <CategoryGroup title="Pengeluaran" categories={expenseCategories} onDelete={deleteCategory} />
          <CategoryGroup title="Pemasukan" categories={incomeCategories} onDelete={deleteCategory} />
          <p className="text-xs text-ink-faint">
            Kategori tanpa tombol hapus adalah kategori bawaan (global) dan tidak bisa dihapus.
          </p>
        </div>
      )}

      {showForm && (
        <Modal title="Tambah kategori" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as TransactionType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    type === t ? "border-ledger-500 bg-ledger-50 text-ledger-600" : "border-paper-line text-ink-soft"
                  }`}
                >
                  {t === "expense" ? "Pengeluaran" : "Pemasukan"}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Nama kategori</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="Contoh: Zakat"
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
      )}
    </Layout>
  );
}
