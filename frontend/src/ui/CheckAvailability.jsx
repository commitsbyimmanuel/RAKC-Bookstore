import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { activeBookSearchQuery, useBookLookup, useGlobalBookSearch } from "../hooks/useBookLookup";
import { useCreateBookRequest, useSearchLocalBooks } from "../services/localAPI";
import { bookEditionLabel, isAudioBook } from "../services/bookMetadata.js";

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

function AddRequestModal({ book, isOpen, onClose, onSubmit, isSubmitting, error }) {
  const [requesterName, setRequesterName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (requesterName.trim()) {
      onSubmit(requesterName.trim());
    }
  };

  // Use portal to render at document.body for full-screen blur effect
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Apple Vision style blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative z-10 w-full max-w-md mx-4 p-6 rounded-3xl 
                      bg-white/10 backdrop-blur-2xl border border-white/20
                      shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">Add Book Request</h2>
        
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
            <h3 className="font-medium text-white">{book.title}</h3>
            <p className="text-sm text-white/60">{book.authors?.join(", ")}</p>
            <p className="text-xs text-white/50 mt-1">{bookEditionLabel(book)}</p>
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
            className="w-full text-white bg-white/10 border border-white/20 rounded-xl px-4 py-3 
                       placeholder:text-white/40 focus:outline-none focus:ring-2 
                       focus:ring-white/30 transition-all mb-6"
            autoFocus
          />
          
          {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 
                         transition-all text-white hover:text-white/80 active:scale-95 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!requesterName.trim() || isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl bg-orange-700 hover:bg-orange-600 
                         disabled:bg-orange-900/50 disabled:cursor-not-allowed
                         transition-all text-white hover:text-white/80 active:scale-95 font-medium"
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
    </div>,
    document.body
  );
}

function BookCard({ book, onAddRequest }) {
  // Show Add Request for: out of stock local books OR books not in local inventory
  const showAddRequest = (book.source === "local" && book.stock === 0) || book.source !== "local";

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
        <p className="text-xs text-white/60 mt-1">{bookEditionLabel(book)}</p>
        <p className="text-xs text-white/40 mt-1">ISBN: {book.isbn}</p>
        {book.publisher && (
          <p className="text-xs text-white/50 mt-1">
            {book.publisher}
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

        {book.source !== "local" && (
          <p className="mt-3 text-sm text-amber-400">
            ⚠️ Not in local inventory
          </p>
        )}

        {/* Add Request button for out of stock or not in inventory */}
        {showAddRequest && (
          <button
            onClick={onAddRequest}
            className="mt-3 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 
                       transition-all active:scale-95 text-sm font-medium"
          >
            📝 Add Request
          </button>
        )}
      </div>
    </div>
  );
}

export default function CheckAvailability() {
  const [isbn, setIsbn] = useState("");
  const [searchISBN, setSearchISBN] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const bookSearchRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(bookSearchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [bookSearchQuery]);

  const { data: lookupBook, isLoading, isError, error } = useBookLookup(searchISBN);
  const matchedBook = lookupBook ? {
    ...selectedBook,
    ...lookupBook,
    format: lookupBook.format || selectedBook?.format,
    edition: lookupBook.edition || selectedBook?.edition,
  } : selectedBook;
  const book = matchedBook && !isAudioBook(matchedBook) ? matchedBook : null;
  const createRequestMutation = useCreateBookRequest();
  const isDebouncing = bookSearchQuery.trim() !== debouncedQuery;
  const activeQuery = activeBookSearchQuery(bookSearchQuery, debouncedQuery);
  const { data: localResults = [], isFetching: isFetchingLocal, isError: isLocalError } = useSearchLocalBooks(activeQuery);
  const { data: globalResults = [], isFetching: isFetchingGlobal, isError: isGlobalError } = useGlobalBookSearch(activeQuery);
  const bookSearchResults = isDebouncing ? [] : localResults.filter(result => !isAudioBook(result));
  const globalSearchResults = isDebouncing ? [] : globalResults;
  const isSearching = isDebouncing || isFetchingLocal || isFetchingGlobal;

  // Close dropdown when clicking outside, and manage dropdown placement
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If clicking inside the portal, ignore
      const portalEl = document.getElementById("dropdown-portal-root");
      if (portalEl && portalEl.contains(event.target)) return;
      
      if (bookSearchRef.current && !bookSearchRef.current.contains(event.target)) {
        setShowBookDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showBookDropdown && bookSearchRef.current) {
      const updateRect = () => {
        const rect = bookSearchRef.current.getBoundingClientRect();
        setDropdownRect({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      };
      
      updateRect();
      window.addEventListener("scroll", updateRect, true);
      window.addEventListener("resize", updateRect);
      return () => {
        window.removeEventListener("scroll", updateRect, true);
        window.removeEventListener("resize", updateRect);
      };
    }
  }, [showBookDropdown]);

  // Auto-search when ISBN reaches 13 digits
  useEffect(() => {
    const cleanISBN = isbn.replace(/[-\s]/g, "");
    if (cleanISBN.length === 13 && /^\d+$/.test(cleanISBN)) {
      setSearchISBN(cleanISBN);
      setShowBookDropdown(false);
    }
  }, [isbn]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const cleanISBN = isbn.replace(/[-\s]/g, "").toUpperCase();
      if (/^(\d{13}|\d{9}[\dX])$/.test(cleanISBN)) {
        setSearchISBN(cleanISBN);
        setBookSearchQuery("");
        setShowBookDropdown(false);
      } else if (isbn.trim()) {
        setDebouncedQuery(isbn.trim());
        setShowBookDropdown(true);
      }
    }
  };

  const handleClear = () => {
    setIsbn("");
    setSearchISBN("");
    setSelectedBook(null);
    setBookSearchQuery("");
    setDebouncedQuery("");
    setShowBookDropdown(false);
  };

  const handleSelectBook = (result) => {
    setSelectedBook(result);
    setIsbn(result.isbn);
    setSearchISBN(result.isbn);
    setShowBookDropdown(false);
    setBookSearchQuery("");
    setDebouncedQuery("");
  };

  const handleAddRequest = () => {
    createRequestMutation.reset();
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
      
      <div className="flex gap-2" ref={bookSearchRef}>
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={isbn}
            onChange={(e) => {
              const val = e.target.value;
              setIsbn(val);
              setSearchISBN("");
              setSelectedBook(null);
              const cleanVal = val.replace(/[-\s]/g, "");
              if (cleanVal.length !== 13 || !/^\d+$/.test(cleanVal)) {
                setBookSearchQuery(val);
                setShowBookDropdown(val.trim().length > 0);
              } else {
                setBookSearchQuery("");
                setShowBookDropdown(false);
              }
            }}
            onFocus={() => {
              if (bookSearchQuery.trim()) setShowBookDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search books by title, author or ISBN"
            placeholder="Scan ISBN or search title/author..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 
                       placeholder:text-white/40 focus:outline-none focus:ring-2 
                       focus:ring-white/30 transition-all"
            autoFocus
          />

          {/* Book Search Results Dropdown - Portaled */}
          {showBookDropdown && dropdownRect && createPortal(
            <div 
              id="dropdown-portal-root"
              className="fixed z-[9999] bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
            >
              <div className="max-h-64 overflow-y-auto">
                {/* Local Results */}
                {bookSearchResults.length > 0 && (
                  <div className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5">Local Inventory</div>
                )}
                {bookSearchResults.map((b) => (
                  <button
                    key={b.isbn}
                    onClick={() => handleSelectBook({ ...b, source: "local" })}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0 flex items-center gap-3"
                  >
                    {b.coverUrl ? (
                      <img src={b.coverUrl} alt={b.title} className="w-8 h-12 object-cover rounded shadow" />
                    ) : (
                      <div className="w-8 h-12 bg-white/10 rounded flex items-center justify-center">
                        <span className="text-[8px] text-white/30">No Img</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{b.title}</p>
                      <p className="text-xs text-white/60 mt-1 truncate">{b.authors?.join(", ")}</p>
                      <p className="text-xs text-white/50 mt-1">{bookEditionLabel(b)}</p>
                      <p className="text-[10px] text-white/40 mt-1">ISBN: {b.isbn}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs ${b.stock > 0 ? "text-green-400" : "text-red-400"}`}>
                        {b.stock > 0 ? `${b.stock} in stock` : "Out of stock"}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Global Results */}
                {globalSearchResults.filter(b => b.isbn).length > 0 && (
                  <div className="px-4 py-2 text-[10px] font-bold text-blue-400/60 uppercase tracking-widest bg-blue-500/5 mt-1 border-y border-white/5">Internet Search · Latest Editions</div>
                )}
                {globalSearchResults.filter(b => b.isbn).map((b) => (
                  <button
                    key={b.isbn}
                    onClick={() => handleSelectBook(b)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-500/10 transition-colors border-b border-white/5 last:border-b-0 flex items-center gap-3"
                  >
                    {b.coverUrl ? (
                      <img src={b.coverUrl} alt={b.title} className="w-8 h-12 object-cover rounded shadow" />
                    ) : (
                      <div className="w-8 h-12 bg-white/10 rounded flex items-center justify-center">
                        <span className="text-[8px] text-white/30">No Img</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-100 font-medium truncate">{b.title}</p>
                      <p className="text-xs text-blue-100/60 mt-1 truncate">{b.authors?.join(", ")}</p>
                      <p className="text-xs text-blue-100/50 mt-1">{bookEditionLabel(b)}</p>
                      <p className="text-[10px] text-white/40 mt-1">ISBN: {b.isbn}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                       <span className={`text-[10px] uppercase font-bold tracking-tighter px-2 py-1 rounded-md ${
                          b.source === "google_books" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                       }`}>
                         {b.source === "google_books" ? "Google Books" : "Open Library"}
                       </span>
                    </div>
                  </button>
                ))}

                {isSearching && (
                  <div role="status" className="p-4 flex items-center justify-center gap-2 text-white/40">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-xs">Searching books...</span>
                  </div>
                )}
                {!isSearching && isLocalError && (
                  <p role="alert" className="p-4 text-xs text-amber-300">Unable to search local inventory. Please try again.</p>
                )}
                {!isSearching && isGlobalError && (
                  <p role="alert" className="p-4 text-xs text-amber-300">Internet book search is unavailable. Please try again shortly.</p>
                )}
                {!isSearching && bookSearchResults.length === 0 && globalSearchResults.length === 0 && !isLocalError && !isGlobalError && (
                  <p role="status" className="p-4 text-sm text-white/60">
                    {debouncedQuery.length < 3
                      ? "Type at least 3 characters to search online by title or author."
                      : "No books found. Try another title, author or ISBN."}
                  </p>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
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
        Search by title or author (3+ characters), or scan an ISBN. Press Enter to search now.
      </p>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-white/60">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Searching...</span>
        </div>
      )}

      {/* Error State */}
      {isError && !book && (
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
          error={createRequestMutation.error?.message}
        />
      )}
    </div>
  );
}

