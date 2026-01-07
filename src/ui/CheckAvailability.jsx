import { useState, useEffect } from "react";
import { useBookLookup } from "../hooks/useBookLookup";
import { useCreateBookRequest } from "../services/localAPI";

function SourceBadge({ source }) {
  const colors = {
    local: "bg-green-600",
    google_books: "bg-blue-600",
    open_library: "bg-purple-600",
  };

  const labels = {
    local: "In Stock",
    google_books: "Google Books",
    open_library: "Open Library",
  };

  return (
    <span className={`${colors[source]} text-xs px-2 py-1 rounded-full`}>
      {labels[source] || source}
    </span>
  );
}

function AddRequestModal({ book, isOpen, onClose, onSubmit, isSubmitting }) {
  const [requesterName, setRequesterName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (requesterName.trim()) {
      onSubmit(requesterName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Apple Vision style blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative z-10 w-full max-w-md mx-4 p-6 rounded-3xl 
                      bg-white/10 backdrop-blur-2xl border border-white/20
                      shadow-2xl">
        <h2 className="text-xl font-semibold mb-4">Add Book Request</h2>
        
        {/* Book preview */}
        <div className="flex gap-4 mb-6 p-4 rounded-xl bg-white/5">
          {book.coverUrl && (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-16 h-24 rounded-lg shadow-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h3 className="font-medium">{book.title}</h3>
            <p className="text-sm text-white/60">{book.authors?.join(", ")}</p>
            <p className="text-xs text-white/40 mt-1">ISBN: {book.isbn}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-white/70 mb-2">
            Requester Name
          </label>
          <input
            type="text"
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            placeholder="Enter name..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 
                       placeholder:text-white/40 focus:outline-none focus:ring-2 
                       focus:ring-white/30 transition-all mb-6"
            autoFocus
          />
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 
                         transition-all active:scale-95 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!requesterName.trim() || isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 
                         disabled:bg-purple-600/50 disabled:cursor-not-allowed
                         transition-all active:scale-95 font-medium"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Request"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookCard({ book, onAddRequest }) {
  const showAddRequest = book.source === "local" && book.stock === 0;

  return (
    <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-20 h-auto rounded-lg shadow-lg object-cover"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight">{book.title}</h3>
          <SourceBadge source={book.source} />
        </div>
        {book.subtitle && (
          <p className="text-sm text-white/60 mt-1">{book.subtitle}</p>
        )}
        <p className="text-sm text-white/80 mt-1">
          {book.authors?.join(", ")}
        </p>
        {book.publisher && (
          <p className="text-xs text-white/50 mt-1">
            {book.publisher} • {book.publishedDate}
          </p>
        )}
        
        {book.source === "local" && book.stock !== null && (
          <div className="mt-3 flex items-center gap-3">
            <span className={`
              ${book.stock === 0 ? "bg-red-700" : book.stock === 1 ? "bg-amber-700" : "bg-green-700"}
              rounded-full px-3 py-1 text-sm
            `}>
              {book.stock === 0 ? "Out of Stock" : `${book.stock} In Stock`}
            </span>
            {book.location && book.stock > 0 && (
              <span className="text-sm text-white/60">
                Location: <strong>{book.location}</strong>
              </span>
            )}
          </div>
        )}

        {/* Add Request button for out of stock books */}
        {showAddRequest && (
          <button
            onClick={onAddRequest}
            className="mt-3 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 
                       transition-all active:scale-95 text-sm font-medium"
          >
            📝 Add Request
          </button>
        )}

        {book.source !== "local" && (
          <p className="mt-3 text-sm text-amber-400">
            ⚠️ Not in local inventory
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckAvailability() {
  const [isbn, setIsbn] = useState("");
  const [searchISBN, setSearchISBN] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: book, isLoading, isError, error } = useBookLookup(searchISBN);
  const createRequestMutation = useCreateBookRequest();

  // Auto-search when ISBN reaches 13 digits
  useEffect(() => {
    const cleanISBN = isbn.replace(/[-\s]/g, "");
    if (cleanISBN.length === 13) {
      setSearchISBN(cleanISBN);
    }
  }, [isbn]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const cleanISBN = isbn.replace(/[-\s]/g, "");
      if (cleanISBN.length >= 10) {
        setSearchISBN(cleanISBN);
      }
    }
  };

  const handleClear = () => {
    setIsbn("");
    setSearchISBN("");
  };

  const handleAddRequest = () => {
    setShowModal(true);
  };

  const handleSubmitRequest = (requesterName) => {
    createRequestMutation.mutate({
      isbn: book.isbn,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      requesterName,
    }, {
      onSuccess: () => {
        setShowModal(false);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
      <h3 className="text-sm text-white/80 mb-3">Check Availability</h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter or scan ISBN..."
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 
                     placeholder:text-white/40 focus:outline-none focus:ring-2 
                     focus:ring-white/30 transition-all"
          autoFocus
        />
        {(isbn || searchISBN) && (
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 
                       transition-all active:scale-95"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-white/40 mt-2">
        Auto-searches on 13 digits • Press Enter for shorter ISBNs
      </p>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-white/60">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Searching...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300">
          {error?.message || "Failed to lookup book"}
        </div>
      )}

      {/* Book Found */}
      {book && !isLoading && (
        <div className="mt-4">
          <BookCard book={book} onAddRequest={handleAddRequest} />
        </div>
      )}

      {/* Not Found */}
      {searchISBN && !book && !isLoading && !isError && (
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <p className="font-medium">Book not found</p>
          <p className="text-sm text-amber-300/70 mt-1">
            ISBN: {searchISBN} was not found in local inventory or online databases.
          </p>
        </div>
      )}

      {/* Add Request Modal */}
      {book && (
        <AddRequestModal
          book={book}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitRequest}
          isSubmitting={createRequestMutation.isPending}
        />
      )}
    </div>
  );
}

