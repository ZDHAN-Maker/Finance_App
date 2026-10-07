import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { PassbookBalanceCard } from "../components/PassbookBalanceCard";
import { CategoryDonutChart } from "../components/CategoryDonutChart";
import { TransactionRow } from "../components/TransactionRow";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionFormModal } from "../components/TransactionFormModal";
import { Modal } from "../components/Modal";
import { useSummary } from "../hooks/useSummary";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import { currentMonthKey } from "../utils/formatDate";
import { formatRupiah } from "../utils/formatCurrency";
import { calculateGoalProgress, summarizeGoalHistory, summarizeSavingsTrend } from "../utils/savingsGoals";
import { getBudgetHealth, getBudgetSplit } from "../utils/budgetInsight";
import { IconPlus, IconTrash } from "../components/Icons";

function formatDate(idDate: string) {
  return new Date(`${idDate}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DashboardPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [goalDeadline, setGoalDeadline] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 6);
    return next.toISOString().slice(0, 10);
  });
  const [goalReminderDays, setGoalReminderDays] = useState(7);
  const [goalRecurringAmount, setGoalRecurringAmount] = useState("");
  const [goalRecurringDay, setGoalRecurringDay] = useState(15);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [depositInputs, setDepositInputs] = useState<Record<string, string>>({});
  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const saved = Number(localStorage.getItem("kas-budget-limit") ?? "0");
    return Number.isFinite(saved) ? saved : 0;
  });

  const { total, monthly, categoryBreakdown, loading: summaryLoading, refetch: refetchSummary } = useSummary(monthKey);
  const { categories } = useCategories();
  const {
    transactions: recent,
    loading: recentLoading,
    createTransaction,
    refetch: refetchTransactions,
  } = useTransactions({ month: monthKey });
  const { goals, addGoal, addContribution, removeGoal, permission, requestNotificationPermission, triggerManualReminder, getReminderDate } = useSavingsGoals();

  const recentFive = recent.slice(0, 5);

  const baseBudget = useMemo(() => {
    const income = monthly?.total_income ?? 0;
    const split = getBudgetSplit(income);
    return {
      split,
      budgetLimitDefault: Math.max(income * 0.7, 0),
    };
  }, [monthly?.total_income]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (budgetLimit === 0) {
      const defaultLimit = Math.max(baseBudget.budgetLimitDefault, 0);
      if (defaultLimit > 0) {
        setBudgetLimit(defaultLimit);
      }
    }
    localStorage.setItem("kas-budget-limit", String(budgetLimit));
  }, [budgetLimit, baseBudget.budgetLimitDefault]);

  const activeGoal = goals.reduce((best, current) => {
    const currentProgress = calculateGoalProgress(current);
    const bestProgress = best ? calculateGoalProgress(best) : null;
    if (!best || currentProgress.progressPercent > bestProgress!.progressPercent) return current;
    return best;
  }, goals[0]);

  const savingsTrend = useMemo(
    () => summarizeSavingsTrend(goals.flatMap((goal) => goal.history ?? []), 6),
    [goals]
  );
  const maxTrendValue = Math.max(...savingsTrend.map((item) => item.total), 1);

  const budgetStatus = getBudgetHealth(
    monthly?.total_income ?? 0,
    monthly?.total_expense ?? 0,
    budgetLimit || baseBudget.budgetLimitDefault
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    goals.forEach((goal) => {
      const progress = calculateGoalProgress(goal);
      if (progress.status === "done") return;
      if (progress.daysLeft > goal.reminderDays) return;

      const reminderKey = `kas-goal-reminder-${goal.id}`;
      if (sessionStorage.getItem(reminderKey)) return;

      new Notification("Target tabungan Anda", {
        body: `${goal.name} tinggal ${Math.max(progress.daysLeft, 0)} hari lagi. Sisa ${formatRupiah(progress.remainingAmount)}.`,
        tag: goal.id,
      });

      sessionStorage.setItem(reminderKey, "1");
    });
  }, [goals]);

  async function handleCreate(input: Parameters<typeof createTransaction>[0]) {
    await createTransaction(input);
    await Promise.all([refetchSummary(), refetchTransactions()]);
  }

  function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    setGoalError(null);

    const target = Number(goalTarget);
    const current = Number(goalCurrent);

    if (!goalName.trim()) {
      setGoalError("Nama target tabungan wajib diisi.");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setGoalError("Nominal target harus lebih dari 0.");
      return;
    }
    if (!Number.isFinite(current) || current < 0) {
      setGoalError("Setoran awal tidak boleh negatif.");
      return;
    }
    if (!goalDeadline) {
      setGoalError("Tanggal target harus diisi.");
      return;
    }

    addGoal({
      name: goalName.trim(),
      targetAmount: target,
      currentAmount: current,
      deadline: goalDeadline,
      reminderDays: goalReminderDays,
      recurringAmount: goalRecurringAmount ? Number(goalRecurringAmount) : 0,
      recurringDay: goalRecurringAmount ? goalRecurringDay : 0,
    });

    setGoalName("");
    setGoalTarget("");
    setGoalCurrent("0");
    setGoalDeadline(() => {
      const next = new Date();
      next.setMonth(next.getMonth() + 6);
      return next.toISOString().slice(0, 10);
    });
    setGoalReminderDays(7);
    setGoalRecurringAmount("");
    setGoalRecurringDay(15);
    setShowGoalForm(false);
  }

  function handleAddContribution(goalId: string) {
    const raw = depositInputs[goalId] ?? "";
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    addContribution(goalId, amount);
    setDepositInputs((prev) => ({ ...prev, [goalId]: "" }));
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink">Target tabungan</h2>
          <button
            type="button"
            onClick={() => setShowGoalForm(true)}
            className="rounded-lg bg-ledger-500 px-3 py-2 text-xs font-semibold text-white hover:bg-ledger-600"
          >
            + Target
          </button>
        </div>

        {permission === "default" && (
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="mb-4 w-full rounded-lg border border-ledger-200 bg-ledger-50 px-3 py-2 text-sm font-medium text-ledger-700"
          >
            Aktifkan notifikasi target
          </button>
        )}

        {goals.length === 0 ? (
          <EmptyState
            title="Belum ada target tabungan"
            description="Buat target agar kamu tahu kapan harus menabung dan berapa yang harus disetor."
          />
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress = calculateGoalProgress(goal);
              const history = summarizeGoalHistory(goal.history ?? []);
              const statusLabel =
                progress.status === "done"
                  ? "Tercapai"
                  : progress.status === "late"
                    ? "Terlambat"
                    : "Dalam proses";

              return (
                <div key={goal.id} className="rounded-2xl border border-paper-line bg-paper p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{goal.name}</p>
                      <p className="text-xs text-ink-faint">
                        {progress.daysLeft >= 0 ? `${progress.daysLeft} hari lagi` : `${Math.abs(progress.daysLeft)} hari terlambat`} •
                        Batas {formatDate(goal.deadline)}
                      </p>
                      <p className="mt-1 text-[11px] text-ledger-700">
                        Pengingat aktif: {formatDate(getReminderDate(goal).toISOString().slice(0, 10))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGoal(goal.id)}
                      aria-label={`Hapus target ${goal.name}`}
                      className="rounded-full p-1.5 text-ink-faint hover:bg-paper-line hover:text-rust-500"
                    >
                      <IconTrash width={15} height={15} />
                    </button>
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="rounded-full bg-ledger-50 px-2 py-1 font-medium text-ledger-700">{statusLabel}</span>
                    <span className="font-medium text-ink">{progress.progressPercent}%</span>
                  </div>

                  <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-paper-line">
                    <div
                      className={`h-full rounded-full ${progress.status === "done" ? "bg-ledger-500" : "bg-ledger-400"}`}
                      style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
                    />
                  </div>

                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-mono font-semibold text-ink">{formatRupiah(progress.currentAmount)}</span>
                    <span className="font-mono text-ink-faint">/ {formatRupiah(progress.targetAmount)}</span>
                  </div>

                  <p className="mb-3 text-xs text-ink-faint">{progress.message}</p>

                  {progress.estimatedFinishDate && (
                    <p className="mb-3 text-[11px] text-ledger-700">
                      Estimasi selesai: {formatDate(progress.estimatedFinishDate)}
                    </p>
                  )}

                  {goal.recurringAmount && goal.recurringAmount > 0 && (
                    <p className="mb-3 text-[11px] text-ledger-700">
                      Auto-save: {formatRupiah(goal.recurringAmount)} tiap tanggal {goal.recurringDay}
                    </p>
                  )}

                  <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px] text-ink-faint">
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="font-semibold text-ink">{formatRupiah(history.total)}</div>
                      <div>Total setor</div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="font-semibold text-ink">{history.count}</div>
                      <div>Setoran</div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="font-semibold text-ink">{formatRupiah(history.latest)}</div>
                      <div>Terakhir</div>
                    </div>
                  </div>

                  {goal.history && goal.history.length > 0 && (
                    <div className="mb-3 space-y-1 rounded-xl bg-white p-2">
                      {goal.history
                        .slice(-3)
                        .reverse()
                        .map((entry, index) => (
                          <div key={`${goal.id}-${entry.date}-${index}`} className="flex items-center justify-between text-[11px] text-ink-soft">
                            <span>{formatDate(entry.date)}</span>
                            <span className="font-semibold text-ledger-700">+{formatRupiah(entry.amount)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={depositInputs[goal.id] ?? ""}
                      onChange={(e) =>
                        setDepositInputs((prev) => ({
                          ...prev,
                          [goal.id]: e.target.value,
                        }))
                      }
                      placeholder="Tambah setor"
                      className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddContribution(goal.id)}
                      className="rounded-lg bg-ledger-500 px-3 py-2 text-sm font-semibold text-white hover:bg-ledger-600"
                    >
                      Setor
                    </button>
                  </div>

                  {permission === "granted" && (
                    <button
                      type="button"
                      onClick={() => triggerManualReminder(goal)}
                      className="mt-3 w-full rounded-lg border border-ledger-200 bg-ledger-50 px-3 py-2 text-xs font-semibold text-ledger-700"
                    >
                      Tes reminder
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-card border border-paper-line bg-paper-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink">Trend tabungan</h2>
          <span className="text-[11px] uppercase tracking-wide text-ink-faint">6 bulan</span>
        </div>

        <div className="mb-4 flex h-36 items-end gap-2 rounded-2xl bg-paper p-3">
          {savingsTrend.map((item) => (
            <div key={item.month} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-24 w-full items-end justify-center rounded-xl bg-ledger-50 p-1">
                <div
                  className="w-full rounded-lg bg-ledger-400 transition-all"
                  style={{
                    height: `${Math.max((item.total / maxTrendValue) * 100, item.total > 0 ? 12 : 4)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-ink-faint">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>Setoran tertinggi</span>
          <span className="font-semibold text-ledger-700">{formatRupiah(Math.max(...savingsTrend.map((item) => item.total), 0))}</span>
        </div>
      </section>

      <section className="mt-6 rounded-card border border-paper-line bg-paper-card p-5">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Insight & rencana anggaran</h2>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-ledger-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-ledger-700">Target utama</p>
            <p className="mt-2 text-lg font-semibold text-ink">{activeGoal ? activeGoal.name : "Belum ada"}</p>
            <p className="text-xs text-ink-faint">
              {activeGoal ? `${calculateGoalProgress(activeGoal).progressPercent}% selesai` : "Buat target untuk mulai menabung."}
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-3">
            <p className="text-[11px] uppercase tracking-wide text-ink-faint">Saran 60/20/20</p>
            <div className="mt-2 space-y-1 text-sm text-ink">
              <p>Kebutuhan: {formatRupiah(baseBudget.split.needs)}</p>
              <p>Hiburan: {formatRupiah(baseBudget.split.wants)}</p>
              <p>Tabungan: {formatRupiah(baseBudget.split.saving)}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-rust-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-rust-600">Status anggaran</p>
            <p className="mt-2 text-lg font-semibold text-ink">{budgetStatus.status === "aman" ? "Aman" : budgetStatus.status === "hati-hati" ? "Hati-hati" : "Over budget"}</p>
            <p className="text-xs text-ink-faint">{budgetStatus.message}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-paper-line bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Batas pengeluaran bulan ini</p>
            <span className="text-xs text-ink-faint">{budgetStatus.status}</span>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={budgetLimit || ""}
              onChange={(e) => setBudgetLimit(Number(e.target.value || 0))}
              placeholder="Masukkan target pengeluaran"
              className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
            />
            <button
              type="button"
              onClick={() => setBudgetLimit(Math.max((monthly?.total_income ?? 0) * 0.7, 0))}
              className="rounded-lg border border-paper-line bg-white px-3 py-2 text-sm font-medium text-ink-soft"
            >
              Auto
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-faint">Pengeluaran saat ini</span>
            <span className="font-mono font-semibold text-ink">{formatRupiah(monthly?.total_expense ?? 0)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-faint">Sisa anggaran</span>
            <span className={`font-mono font-semibold ${budgetStatus.remaining >= 0 ? "text-ledger-600" : "text-rust-500"}`}>
              {formatRupiah(budgetStatus.remaining)}
            </span>
          </div>
        </div>
      </section>

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

      {showGoalForm && (
        <Modal title="Tambah target tabungan" onClose={() => setShowGoalForm(false)}>
          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Nama target</label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Contoh: Liburan Bali"
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Target (Rp)</label>
              <input
                type="number"
                min={1}
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="5000000"
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Setoran awal (Rp)</label>
              <input
                type="number"
                min={0}
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Tanggal target</label>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Auto-save per bulan</label>
                <input
                  type="number"
                  min={0}
                  value={goalRecurringAmount}
                  onChange={(e) => setGoalRecurringAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Tanggal auto-save</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={goalRecurringDay}
                  onChange={(e) => setGoalRecurringDay(Number(e.target.value || 1))}
                  className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Pengingat (hari sebelum deadline)</label>
              <select
                value={goalReminderDays}
                onChange={(e) => setGoalReminderDays(Number(e.target.value))}
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
              >
                <option value={1}>1 hari</option>
                <option value={3}>3 hari</option>
                <option value={7}>7 hari</option>
                <option value={14}>14 hari</option>
                <option value={30}>30 hari</option>
              </select>
            </div>

            {goalError && <p className="text-sm text-rust-500">{goalError}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-ledger-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-ledger-600"
            >
              Simpan target
            </button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
