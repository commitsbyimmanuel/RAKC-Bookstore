import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePayments, useUpdatePayment } from "../services/localAPI";
import PaymentModal from "../ui/PaymentModal";

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPayment, setSelectedPayment] = useState(null);
  const statusFilter = searchParams.get("status"); // "Pending", "Complete", or null (all)
  const paymentMethodFilter = searchParams.get("method"); // "Cash", "Bank Transfer", or null (all)

  // Fetch all payments (we filter client-side for tab counts)
  const { data: allPayments = [], isLoading, isError } = usePayments();
  const updatePaymentMutation = useUpdatePayment();

  // Filter payments based on status and payment method query params
  const filteredPayments = allPayments.filter((p) => {
    const matchesStatus = !statusFilter || p.paymentStatus === statusFilter;
    const matchesMethod = !paymentMethodFilter || p.paymentMethod === paymentMethodFilter;
    return matchesStatus && matchesMethod;
  });

  const handleFilterChange = (filterType, value) => {
    const newParams = {};
    
    // Preserve existing filters
    if (statusFilter) newParams.status = statusFilter;
    if (paymentMethodFilter) newParams.method = paymentMethodFilter;
    
    // Update the specific filter
    if (filterType === "status") {
      if (value) {
        newParams.status = value;
      } else {
        delete newParams.status;
      }
    } else if (filterType === "method") {
      if (value) {
        newParams.method = value;
      } else {
        delete newParams.method;
      }
    }
    
    setSearchParams(newParams);
  };

  const handlePaymentConfirm = async (amount) => {
    if (!selectedPayment) return;
    
    const newAmountPaid = (selectedPayment.amountPaid || 0) + amount;
    const pendingAmount = selectedPayment.totalAmount - newAmountPaid;
    const newPaymentStatus = pendingAmount <= 0 ? "Complete" : "Pending";
    
    try {
      await updatePaymentMutation.mutateAsync({
        id: selectedPayment.id,
        amountPaid: newAmountPaid,
        paymentStatus: newPaymentStatus,
      });
      setSelectedPayment(null);
    } catch (err) {
      console.error("Failed to update payment:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full">
        <h1 className="text-2xl mb-3">Payments</h1>
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="flex items-center gap-2 text-white/60">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Loading payments...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full">
        <h1 className="text-2xl mb-3">Payments</h1>
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="text-center text-red-400">
            Failed to load payments. Make sure json-server is running.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <h1 className="text-2xl mb-3">Payments</h1>

      {/* Filter Controls */}
      <div className="flex justify-between items-center mb-4">
        {/* Status Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange("status", null)}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              !statusFilter
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            All ({allPayments.length})
          </button>
          <button
            onClick={() => handleFilterChange("status", "Pending")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              statusFilter === "Pending"
                ? "bg-amber-600 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Pending ({allPayments.filter((p) => p.paymentStatus === "Pending").length})
          </button>
          <button
            onClick={() => handleFilterChange("status", "Complete")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              statusFilter === "Complete"
                ? "bg-green-700 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Complete ({allPayments.filter((p) => p.paymentStatus === "Complete").length})
          </button>
        </div>

        {/* Payment Method Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange("method", null)}
            className={`px-3 py-2 rounded-full text-sm transition-all ${
              !paymentMethodFilter
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            All Methods
          </button>
          <button
            onClick={() => handleFilterChange("method", "Cash")}
            className={`px-3 py-2 rounded-full text-sm transition-all ${
              paymentMethodFilter === "Cash"
                ? "bg-orange-600 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            💵 Cash
          </button>
          <button
            onClick={() => handleFilterChange("method", "Bank Transfer")}
            className={`px-3 py-2 rounded-full text-sm transition-all ${
              paymentMethodFilter === "Bank Transfer"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            💳 Bank Transfer
          </button>
        </div>
      </div>

      {filteredPayments.length === 0 && (
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="text-center">
            {statusFilter || paymentMethodFilter
              ? "No payments match the selected filters!"
              : "No payments pending!"}
          </div>
        </div>
      )}
      <div className="divide-y-1">
        {filteredPayments.map((entry) => (
          <div
            key={entry.id}
            onClick={() => setSelectedPayment(entry)}
            className="py-5 items-center flex justify-between cursor-pointer hover:bg-white/5 rounded-2xl px-4 transition-all"
          >
          <div className="flex-col">
              <div className="text-lg">{entry.customerName}</div>
              {entry.paymentStatus === "Pending" ? (
                <div className="text-sm italic font-medium">
                  Amount Pending: {entry.totalAmount - (entry.amountPaid || 0)}
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 items-center">
              {/* Payment Method Pill */}
              <div
                className={`${
                  entry.paymentMethod === "Bank Transfer"
                    ? "bg-blue-600/80"
                    : "bg-orange-600/80"
                } rounded-full py-2 px-3 text-xs font-medium`}
              >
                {entry.paymentMethod === "Bank Transfer" ? "💳" : "💵"} {entry.paymentMethod || "Cash"}
              </div>
              {/* Status Pill */}
              <div
                className={`${
                  entry.paymentStatus === "Pending" ? "bg-amber-600" : "bg-green-700"
                } rounded-full py-2 px-3 w-23 text-xs font-medium text-center`}
              >
                {entry.paymentStatus}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onConfirm={handlePaymentConfirm}
        />
      )}
    </div>
  );
}
