import { useSearchParams } from "react-router-dom";
import { usePayments } from "../services/localAPI";

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status"); // "Pending", "Complete", or null (all)

  // Fetch all payments (we filter client-side for tab counts)
  const { data: allPayments = [], isLoading, isError } = usePayments();

  // Filter payments based on status query param
  const filteredPayments = statusFilter
    ? allPayments.filter((p) => p.status === statusFilter)
    : allPayments;

  const handleFilterChange = (status) => {
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleFilterChange(null)}
          className={`px-4 py-2 rounded-full text-sm transition-all ${
            !statusFilter
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          All ({allPayments.length})
        </button>
        <button
          onClick={() => handleFilterChange("Pending")}
          className={`px-4 py-2 rounded-full text-sm transition-all ${
            statusFilter === "Pending"
              ? "bg-amber-600 text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          Pending ({allPayments.filter((p) => p.status === "Pending").length})
        </button>
        <button
          onClick={() => handleFilterChange("Complete")}
          className={`px-4 py-2 rounded-full text-sm transition-all ${
            statusFilter === "Complete"
              ? "bg-green-700 text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          Complete ({allPayments.filter((p) => p.status === "Complete").length})
        </button>
      </div>

      {filteredPayments.length === 0 && (
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="text-center">
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} payments!`
              : "No payments pending!"}
          </div>
        </div>
      )}
      <div className="divide-y-1">
        {filteredPayments.map((entry) => (
          <div
            key={entry.id}
            className="py-5 items-center flex justify-between"
          >
            <div className="flex-col">
              <div className="text-lg">{entry.payer}</div>
              {entry.status === "Pending" ? (
                <div className="text-sm italic font-medium">
                  Amount Pending: {entry.total_amount - entry.amount_payed}
                </div>
              ) : null}
            </div>
            <div
              className={`${
                entry.status === "Pending" ? "bg-amber-600" : "bg-green-700"
              } rounded-full p-1 px-2 w-23 text-center`}
            >
              {entry.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
