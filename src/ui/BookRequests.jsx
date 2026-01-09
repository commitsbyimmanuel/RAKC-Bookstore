import { useBookRequests, useFulfillBookRequest } from "../services/localAPI";

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestCard({ request, onFulfill, isLoading }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-white/10 last:border-b-0">
      {/* Book Cover */}
      {request.coverUrl && (
        <img
          src={request.coverUrl}
          alt={request.title}
          className="w-14 h-20 rounded-lg shadow-lg object-cover flex-shrink-0"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg truncate">{request.title}</h3>
        <p className="text-sm text-white/70">{request.authors?.join(", ")}</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-sm text-purple-300">
            👤 {request.requesterName}
          </span>
          <span className="text-xs text-white/40">
            {formatDate(request.requestedAt)}
          </span>
        </div>
      </div>
      
      <button
        onClick={() => onFulfill(request.id)}
        disabled={isLoading}
        className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 
                   disabled:bg-green-600/50 disabled:cursor-not-allowed
                   transition-all active:scale-95 text-sm font-medium flex-shrink-0"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Fulfilling...
          </span>
        ) : (
          "✓ Mark Fulfilled"
        )}
      </button>
    </div>
  );
}

export default function BookRequests() {
  const { data: requests = [], isLoading, isError } = useBookRequests();
  const fulfillMutation = useFulfillBookRequest();

  const handleFulfill = (id) => {
    fulfillMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
        <h3 className="text-sm text-white/80 mb-3">Book Requests</h3>
        <div className="flex justify-center items-center h-32">
          <div className="flex items-center gap-2 text-white/60">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Loading requests...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
        <h3 className="text-sm text-white/80 mb-3">Book Requests</h3>
        <div className="flex justify-center items-center h-32">
          <div className="text-center text-red-400">
            Failed to load requests. Unable to reach backend.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-white/80">Book Requests</h3>
        {requests.length > 0 && (
          <span className="text-xs bg-purple-600 px-2 py-1 rounded-full">
            {requests.length} pending
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-center text-white/50">
            🎉 No pending book requests!
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onFulfill={handleFulfill}
              isLoading={fulfillMutation.isPending && fulfillMutation.variables === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
