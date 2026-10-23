import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function AdjustStockModal({ book, onClose, onSubmit, isSaving }) {
  const [newStock, setNewStock] = useState(String(book.stock ?? 0));
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const id = useId();

  const normalizedComment = comment.trim().replace(/\s+/g, " ");
  const wordCount = normalizedComment
    .split(" ")
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  const stock = Number(newStock);
  const isValidStock = newStock.trim() !== "" && Number.isSafeInteger(stock) && stock >= 0;
  const isValidComment = normalizedComment.length >= 10 && wordCount >= 3;
  const canSubmit = isValidStock && isValidComment && !isSaving;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    try {
      await onSubmit({ stock, comment: normalizedComment });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to adjust stock. Please try again.");
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/20 bg-neutral-950 p-6 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <h2 id={`${id}-title`} className="text-xl font-bold">Adjust stock</h2>
      <p id={`${id}-description`} className="mt-2 text-sm text-white/60 break-words">
        Set the new stock count for {book.title}. Current stock: {book.stock ?? 0}.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor={`${id}-stock`} className="mb-2 block text-sm text-white/70">
            New stock
          </label>
          <input
            id={`${id}-stock`}
            type="number"
            min="0"
            step="1"
            required
            autoFocus
            value={newStock}
            disabled={isSaving}
            onChange={(event) => {
              setNewStock(event.target.value);
              setError("");
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div>
          <label htmlFor={`${id}-comment`} className="mb-2 block text-sm text-white/70">
            Reason for adjustment
          </label>
          <textarea
            id={`${id}-comment`}
            rows="4"
            required
            minLength={10}
            value={comment}
            disabled={isSaving}
            onChange={(event) => {
              setComment(event.target.value);
              setError("");
            }}
            placeholder="Explain why the stock is being adjusted..."
            aria-describedby={`${id}-comment-hint`}
            className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <p id={`${id}-comment-hint`} className="mt-2 text-xs text-white/50">
            At least 10 characters and 3 words. {normalizedComment.length} characters, {wordCount} words.
          </p>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white/60 hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-[2] rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Adjusting..." : "Save adjustment"}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
