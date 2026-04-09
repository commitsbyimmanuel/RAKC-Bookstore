import { useEffect, useRef, useState } from "react";
import { useBookLookup } from "../hooks/useBookLookup";
import { useAddBook, useBooks, useUpdateBook } from "../services/localAPI";
import BookOnShelf from "../ui/BookOnShelf";
import Button from "../ui/Button";

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [price, setPrice] = useState("");
  const [page, setPage] = useState(1);
  const [highlightedISBN, setHighlightedISBN] = useState(null);
  
  const { data: allStock = [], isLoading: isLoadingStock, isError: isStockError } = useBooks();
  const addBookMutation = useAddBook();
  const updateBookMutation = useUpdateBook();
  
  const observerTarget = useRef(null);
  const ITEMS_PER_PAGE = 5;

  // Auto-select when ISBN is scanned/typed and found locally
  useEffect(() => {
    const cleanSearch = searchQuery.replace(/[-\s]/g, "");
    if (cleanSearch.length === 10 || cleanSearch.length === 13) {
      const found = allStock.find(b => 
        b.isbn.replace(/[-\s]/g, "") === cleanSearch
      );
      if (found) {
        setSelectedBook(found);
      }
    }
  }, [searchQuery, allStock]);

  // Sync state when book is selected
  useEffect(() => {
    if (selectedBook) {
      // Default to 1 for adding/updating stock
      setQuantity(1);
      setLocation(selectedBook.location || "");
      setPrice(selectedBook.price?.toString() || "");
    } else {
      setQuantity(1);
      setLocation("");
      setPrice("");
    }
    setLocationError("");
  }, [selectedBook]);

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
      // Already handled by auto-select useEffect, or just clear if not found
      if (!selectedBook && (searchQuery.length === 10 || searchQuery.length === 13)) {
        console.log("Book not found in local stock");
      }
    }
  };

  const handleAddBook = async () => {
    // Adding new books is disabled on Stock page per local-only requirement
    // But we keep the logic structure in case it's needed elsewhere
    return;
  };

  const handleUpdateStock = async () => {
    if (!selectedBook) return;
    
    const error = validateLocation(location);
    if (error) {
      setLocationError(error);
      return;
    }

    try {
      // Calculate new stock as current stock + quantity entered
      const updatedStock = (selectedBook.stock || 0) + quantity;
      
      await updateBookMutation.mutateAsync({
        id: selectedBook.id,
        stock: updatedStock,
        location: location.toUpperCase(),
        price: parseFloat(price) || selectedBook.price || 0,
      });
      
      // Highlight the book in the list
      setHighlightedISBN(selectedBook.isbn);
      setTimeout(() => setHighlightedISBN(null), 3000);
      
      // Clear panel and reset state
      setSearchQuery("");
      setSelectedBook(null);
      setQuantity(1);
      setLocation("");
      setLocationError("");
      setPrice("");
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  // Filter and paginate stock
  const filteredStock = allStock.filter(item => {
    if (highlightedISBN && item.isbn === highlightedISBN) return true;
    if (highlightedISBN) return false;

    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.isbn.includes(query) ||
      item.authors.some(a => a.toLowerCase().includes(query))
    );
  });
  
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
      
      {/* Search Bar Section */}
      <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by title, author, or ISBN..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-2
                     text-white placeholder:text-white/30 focus:outline-none 
                     focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all font-mono text-sm shadow-inner"
          autoFocus
        />
      </div>

      {/* Book Details Panel */}
      {selectedBook && (
        <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-6 animate-in fade-in zoom-in-95">
          <div className="flex gap-6">
            {/* Book Cover */}
            {selectedBook.coverUrl && (
              <img
                src={selectedBook.coverUrl}
                alt={selectedBook.title}
                className="w-24 h-32 rounded-xl object-cover shadow-lg ring-1 ring-white/20"
              />
            )}
            
            {/* Book Info & Controls */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-green-500/20 text-green-400">
                  IN STOCK
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{selectedBook.title}</h3>
              <p className="text-sm text-white/60 mb-4">{selectedBook.authors?.join(", ")}</p>
              
              <div className="grid gap-3 grid-cols-4">
                {/* Quantity Control */}
                <div>
                  <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                    New Stock
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

                {/* Current Stock Display */}
                <div>
                  <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                    Current Stock
                  </label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 h-[46px] flex items-center justify-center text-white/70 font-mono text-lg">
                    {selectedBook.stock}
                  </div>
                </div>

                {/* Location Input */}
                <div>
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
                    placeholder="X-X-X"
                    className={`w-full bg-white/5 border rounded-2xl px-4 h-[46px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all shadow-inner ${
                      locationError ? 'border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/10 focus:bg-white/10'
                    }`}
                  />
                  {locationError && (
                    <p className="text-[10px] text-red-400 mt-1 uppercase tracking-tight">{locationError}</p>
                  )}
                </div>

                {/* Price Input */}
                <div>
                  <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">AED</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-4 h-[46px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:bg-white/10 transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBook(null);
                    setQuantity(1);
                    setLocation("");
                  }}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleUpdateStock}
                  disabled={updateBookMutation.isPending}
                  className="flex-[2] h-12"
                >
                  {updateBookMutation.isPending ? "Updating..." : "Update Stock & Location"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Lookup status (Removed) */}



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
              onClick={() => {
                setSelectedBook(entry)
                window.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                });
              }}
              className={`py-3 px-4 items-center flex justify-between rounded-2xl cursor-pointer transition-all ${
                entry.isbn === highlightedISBN 
                  ? 'bg-orange-500/20 border border-orange-500/40' 
                  : entry === selectedBook
                  ? 'bg-white/20 border border-white/40 ring-1 ring-white/20'
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
