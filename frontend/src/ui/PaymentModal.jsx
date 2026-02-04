import { useState } from "react";
import Button from "./Button";

export default function PaymentModal({ payment, onClose, onConfirm }) {
  const [amountToPay, setAmountToPay] = useState("");
  const [error, setError] = useState("");

  const pendingAmount = payment.totalAmount - (payment.amountPaid || 0);
  const isBankTransfer = payment.paymentMethod === "Bank Transfer";

  const handleConfirm = () => {
    const amount = parseFloat(amountToPay);
    
    if (!amountToPay || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    if (amount > pendingAmount) {
      setError(`Amount cannot exceed pending amount (AED ${pendingAmount})`);
      return;
    }
    
    onConfirm(amount);
  };

  const handleMarkAsReceived = () => {
    // For bank transfer, mark the full pending amount as received
    onConfirm(pendingAmount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black/70 p-6 shadow-2xl backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-bold text-white">
          {isBankTransfer ? "Bank Transfer Payment" : "Record Payment"}
        </h2>
        
        <div className="mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Customer:</span>
            <span className="font-medium text-white">{payment.customerName}</span>
          </div>
          {isBankTransfer && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Payment Method:</span>
              <span className="font-medium text-blue-400">💳 Bank Transfer</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total Amount:</span>
            <span className="font-medium text-white">AED {payment.totalAmount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Amount Paid:</span>
            <span className="font-medium text-white">AED {payment.amountPaid || 0}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-base">
            <span className="text-white/80">Amount Pending:</span>
            <span className="font-bold text-amber-400">AED {pendingAmount}</span>
          </div>
        </div>

        {isBankTransfer ? (
          <div className="mb-6">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 mb-4">
              <p className="text-sm text-blue-300">
                💳 Click "Mark as Received" to confirm the full bank transfer has been received
              </p>
              <p className="text-xs text-blue-300/70 mt-1">
                This will update the payment to AED {pendingAmount} and mark as Complete
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/30">
              Amount being Paid
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">AED</span>
              <input
                type="number"
                value={amountToPay}
                onChange={(e) => {
                  setAmountToPay(e.target.value);
                  setError("");
                }}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={pendingAmount}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-16 pr-4 text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-xs uppercase tracking-tight text-red-400">{error}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="h-12 flex-1">
            Cancel
          </Button>
          {isBankTransfer ? (
            <Button variant="primary" onClick={handleMarkAsReceived} className="h-12 flex-[2]">
              ✓ Mark as Received
            </Button>
          ) : (
            <Button variant="primary" onClick={handleConfirm} className="h-12 flex-[2]">
              Confirm Payment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
