import { useState } from "react";
import { Layout } from "../components/Layout";
import { PassbookBalanceCard } from "../components/PassbookBalanceCard";
import { CategoryDonutChart } from "../components/CategoryDonutChart";
import { TransactionRow } from "../components/TransactionRow";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionFormModal } from "../components/TransactionFormModal";
import { useSummary } from "../hooks/useSummary";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { currentMonthKey } from "../utils/formatDate";
import { formatRupiah } from "../utils/formatCurrency";
import { IconPlus } from "../components/Icons";

export function DashboardPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [showAddForm, setShowAddForm] = useState(false);

  const { total, monthly, categoryBreakdown, loading: summaryLoading, refetch: refetchSummary } = useSummary(monthKey);
  const { categories } = useCategories();
  const {
    transactions: recent,
    loading: recentLoading,
    createTransaction,
    refetch: refetchTransactions,
  } = useTransactions({ month: monthKey });

  const recentFive = recent.slice(0, 5);

  async function handleCreate(input: Parameters<typeof createTransaction>[0]) {
    await createTransaction(input);
    await Promise.all([refetchSummary(), refetchTransactions()]);
  }

  return (
    <Layout>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
      </div>

      {summaryLoading && !total ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <PassbookBalanceCard
          balance={total?.balance ?? 0}
          totalIncome={monthly?.total_income ?? 0}
          totalExpense={monthly?.total_expense ?? 0}
          transactionCount={total?.transaction_count ?? 0}
        />
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-paper-line bg-paper-card p-4">
          <p className="text-xs font-medium text-ink-faint">Pemasukan bulan ini</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ledger-600">
            {formatRupiah(monthly?.total_income ?? 0)}
          </p>
        </div>
        <div className="rounded-card border border-paper-line bg-paper-card p-4">
          <p className="text-xs font-medium text-ink-faint">Pengeluaran bulan ini</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-rust-500">
            {formatRupiah(monthly?.total_expense ?? 0)}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-card border border-paper-line bg-paper-card p-5">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Pengeluaran per kategori</h2>
        {summaryLoading && !categoryBreakdown ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <CategoryDonutChart breakdown={categoryBreakdown?.breakdown ?? []} />
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Transaksi terbaru</h2>
        </div>

        <div className="rounded-card border border-paper-line bg-paper-card px-4">
          {recentLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentFive.length === 0 ? (
            <div className="py-4">
              <EmptyState
                title="Belum ada transaksi bulan ini"
                description="Catat lewat Telegram atau tombol tambah di bawah."
              />
            </div>
          ) : (
            recentFive.map((t) => <TransactionRow key={t.id} transaction={t} />)
          )}
        </div>
      </section>

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
          onSubmit={handleCreate}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </Layout>
  );
}
