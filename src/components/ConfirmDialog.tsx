import { Modal } from "./Modal";

interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel = "Hapus", danger = true, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-ink-soft">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-paper-line/60"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            danger ? "bg-rust-500 hover:bg-rust-600" : "bg-ledger-500 hover:bg-ledger-600"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
