import { useEffect, useRef, useState } from "react";
import { useBookLookup } from "../hooks/useBookLookup";
import { useAddBook, useBooks, useUpdateBook } from "../services/localAPI";
import BookOnShelf from "../ui/BookOnShelf";
import Button from "../ui/Button";

export default function Stock() {
  const [isbn, setIsbn] = useState("");
  const [searchISBN, setSearchISBN] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [page, setPage] = useState(1);
  const [highlightedISBN, setHighlightedISBN] = useState(null);
  
  const { data: allStock = [], isLoading: isLoadingStock, isError: isStockError } = useBooks();
  const { data: book, isLoading: isLookingUp, isError: isLookupError, error } = useBookLookup(searchISBN);
  const addBookMutation = useAddBook();
  const updateBookMutation = useUpdateBook();
  
  const observerTarget = useRef(null);
  const ITEMS_PER_PAGE = 5;

  // Auto-search when ISBN reaches 13 digits
  useEffect(() => {
    const cleanISBN = isbn.replace(/[-\s]/g, "");
    if (cleanISBN.length === 13) {
      setSearchISBN(cleanISBN);
    }
  }, [isbn]);

  // Sync state when book is found in local stock
  useEffect(() => {
    if (book && book.source === "local") {
      setQuantity(book.stock || 0);
      setLocation(book.location || "");
    } else {
      setQuantity(1);
      setLocation("");
    }
    setLocationError("");
  }, [book]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && displayedStock.length < filteredStock.length) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [allStock, page]);

  const validateLocation = (loc) => {
    const regex = /^[A-Z0-9]-[A-Z0-9]-[A-Z0-9]$/i;
    if (!loc) return "Location is required";
    if (!regex.test(loc)) return "Format must be X-X-X (Aisle-Row-Column)";
    return "";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const cleanISBN = isbn.replace(/[-\s]/g, "");
      if (cleanISBN.length >= 10) {
        setSearchISBN(cleanISBN);
      }
    }
  };

  const handleAddBook = async () => {
    if (!book || book.source === "local") return;
    
    const error = validateLocation(location);
    if (error) {
      setLocationError(error);
      return;
    }

    try {
      await addBookMutation.mutateAsync({
        isbn: book.isbn,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        stock: quantity,
        location: location.toUpperCase(),
        price: 0, // Default price, can be updated later
      });
      
      // Reset form
      setIsbn("");
      setSearchISBN("");
      setQuantity(1);
      setLocation("");
    } catch (err) {
      console.error("Failed to add book:", err);
    }
  };

  const handleUpdateStock = async () => {
    if (!book || book.source !== "local") return;
    
    const error = validateLocation(location);
    if (error) {
      setLocationError(error);
      return;
    }

    try {
      // Calculate new stock as current stock + quantity entered
      const updatedStock = (book.stock || 0) + quantity;
      
      await updateBookMutation.mutateAsync({
        id: book.id,
        stock: updatedStock,
        location: location.toUpperCase(),
      });
      
      // Highlight the book in the list
      setHighlightedISBN(book.isbn);
      setTimeout(() => setHighlightedISBN(null), 3000);
      
      // Clear panel and reset state
      setIsbn("");
      setSearchISBN("");
      setQuantity(1);
      setLocation("");
      setLocationError("");
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  // Filter and paginate stock
  const filteredStock = highlightedISBN 
    ? allStock.filter(item => item.isbn === highlightedISBN)
    : allStock;
  
  const displayedStock = filteredStock.slice(0, page * ITEMS_PER_PAGE);

  if (isLoadingStock) {
    return (
      <div className="w-full h-full">
        <h1 className="text-2xl mb-3">Stock</h1>
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="flex items-center gap-2 text-white/60">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Loading stock...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isStockError) {
    return (
      <div className="w-full h-full">
        <h1 className="text-2xl mb-3">Stock</h1>
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="text-center text-red-400">
            Failed to load stock. Make sure json-server is running.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-5">
      <h1 className="text-2xl">Stock Management</h1>
      
      {/* ISBN Scanner Section */}
      <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-4">
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan or type ISBN to add/update stock..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-2
                     text-white placeholder:text-white/30 focus:outline-none 
                     focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all font-mono text-sm shadow-inner"
          autoFocus
        />
      </div>

      {/* Book Details Panel */}
      {book && !isLookingUp && (
        <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-6 animate-in fade-in zoom-in-95">
          <div className="flex gap-6">
            {/* Book Cover */}
            {book.coverUrl && (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-24 h-32 rounded-xl object-cover shadow-lg ring-1 ring-white/20"
              />
            )}
            
            {/* Book Info & Controls */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter ${
                  book.source === 'local' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {book.source === 'local' ? 'IN STOCK' : 'NOT IN STOCK'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{book.title}</h3>
              <p className="text-sm text-white/60 mb-4">{book.authors?.join(", ")}</p>
              
              <div className={`grid gap-3 ${book.source === 'local' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {/* Quantity Control */}
                <div>
                  <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                    {book.source === 'local' ? 'New Stock' : 'Quantity'}
                  </label>
                  <div className="flex w-full justify-between gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/20">
                    <button 
                      onClick={() => setQuantity(prev => Math.max(prev - 1, 0))}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/20 text-white transition-all"
                    >-</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-lg font-mono text-white w-16 text-center bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0"
                    />
                    <button 
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/20 text-white transition-all"
                    >+</button>
                  </div>
                </div>

                {/* Current Stock Display (for existing books only) */}
                {book.source === 'local' && (
                  <div>
                    <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                      Current Stock
                    </label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 h-[46px] flex items-center justify-center text-white/70 font-mono text-lg">
                      {book.stock}
                    </div>
                  </div>
                )}

                {/* Location Input */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setLocationError("");
                    }}
                    placeholder="X-X-X (e.g. A-1-5)"
                    className={`w-full bg-white/5 border rounded-2xl px-4 h-[46px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all shadow-inner ${
                      locationError ? 'border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/10 focus:bg-white/10'
                    }`}
                  />
                  {locationError && (
                    <p className="text-[10px] text-red-400 mt-1 uppercase tracking-tight">{locationError}</p>
                  )}
                </div>

                
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsbn("");
                    setSearchISBN("");
                    setQuantity(1);
                    setLocation("");
                  }}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                
                {book.source === 'local' ? (
                  <Button
                    variant="primary"
                    onClick={handleUpdateStock}
                    disabled={updateBookMutation.isPending}
                    className="flex-[2] h-12"
                  >
                    {updateBookMutation.isPending ? "Updating..." : "Update Stock & Location"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleAddBook}
                    disabled={addBookMutation.isPending}
                    className="flex-[2] h-12"
                  >
                    {addBookMutation.isPending ? "Adding..." : "Add to Stock"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLookingUp && (
        <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-6">
          <div className="flex items-center justify-center gap-3 text-white/60">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Looking up book...</span>
          </div>
        </div>
      )}

      {isLookupError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur p-4 text-red-400 text-center">
          {error?.message || "Error looking up book"}
        </div>
      )}

      {/* Stock List */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-white mb-4 font-mono tracking-tight uppercase">
          Current Stock ({allStock.length} books)
        </h2>
        
        {allStock.length === 0 && (
          <div className="flex justify-center items-center w-full h-[20vh] text-white/40">
            No books in stock. Start adding some!
          </div>
        )}

        <div className="space-y-2">
          {displayedStock.map((entry) => (
            <div
              key={entry.isbn}
              className={`py-3 px-4 items-center flex justify-between rounded-2xl transition-all ${
                entry.isbn === highlightedISBN 
                  ? 'bg-orange-500/20 border border-orange-500/40' 
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <BookOnShelf book={entry} />
                <div className="min-w-[400px]">
                  <div className="text-lg font-medium text-white">{entry.title}</div>
                  <div className="text-sm text-white/60">{entry.authors?.join(", ")}</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {entry.stock > 0 && (
                  <div className="text-center text-sm text-white/70">
                    <div className="text-xs text-white/40 uppercase tracking-wide mb-1">Location</div>
                    <div className="font-medium">{entry.location}</div>
                  </div>
                )}

                <div>
                  {entry.stock === 0 ? (
                    <div className="bg-red-700 rounded-full px-4 py-2 text-sm font-semibold text-center min-w-[120px]">
                      Out of Stock
                    </div>
                  ) : (
                    <div
                      className={`${
                        entry.stock === 1 ? "bg-amber-700" : "bg-green-700"
                      } rounded-full px-4 py-2 text-sm font-semibold text-center min-w-[120px]`}
                    >
                      {entry.stock} In Stock
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Observer target for infinite scroll */}
          {displayedStock.length < filteredStock.length && (
            <div ref={observerTarget} className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-white/40">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
