import { useState } from "react";
import Button from "./Button";

export default function CheckoutModal({ totalAmount, customerName, onClose, onConfirm }) {
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const amount = parseFloat(amountPaid);
    
    if (!amountPaid || isNaN(amount) || amount < 0) {
      setError("Please enter a valid amount (0 or more)");
      return;
    }
    
    onConfirm(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black/70 p-6 shadow-2xl backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-bold text-white">Complete Sale</h2>
        
        <div className="mb-6 space-y-3">
          {customerName && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Customer:</span>
              <span className="font-medium text-white">{customerName}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-3 text-base">
            <span className="text-white/80">Total Amount:</span>
            <span className="font-bold text-amber-400">AED {totalAmount}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/30">
            Amount Being Paid
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">AED</span>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => {
                setAmountPaid(e.target.value);
                setError("");
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-16 pr-4 text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          </div>
          {error && (
            <p className="mt-2 text-xs uppercase tracking-tight text-red-400">{error}</p>
          )}
          {amountPaid && !isNaN(parseFloat(amountPaid)) && parseFloat(amountPaid) < totalAmount && (
            <p className="mt-2 text-xs text-amber-400">
              ⚠️ Partial payment - Will be marked as Pending
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="h-12 flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} className="h-12 flex-[2]">
            Complete Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
