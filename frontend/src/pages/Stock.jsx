import { useEffect, useRef, useState } from "react";
import SelectedBookCard from "../components/stock/SelectedBookCard";
import StockList from "../components/stock/StockList";
import StockSearchBar from "../components/stock/StockSearchBar";
import { useBookLookup } from "../hooks/useBookLookup";
import { useAddBook, useAdjustBookStock, useBooks, useUpdateBook } from "../services/localAPI";

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [quantity, setQuantity] = useState(0);
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [price, setPrice] = useState("");
  const [page, setPage] = useState(1);
  const [highlightedISBN, setHighlightedISBN] = useState(null);
  const [isbnToLookup, setIsbnToLookup] = useState("");

  const {
    data: allStock = [],
    isLoading: isLoadingStock,
    isError: isStockError,
  } = useBooks();
  const addBookMutation = useAddBook();
  const updateBookMutation = useUpdateBook();
  const adjustStockMutation = useAdjustBookStock();

  // Global book lookup (Google Books / Open Library fallback)
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    isError: isLookupError,
  } = useBookLookup(isbnToLookup);

  const observerTarget = useRef(null);
  const ITEMS_PER_PAGE = 5;

  // Determine if the search query looks like an ISBN
  const cleanSearch = searchQuery.replace(/[-\s]/g, "");
  const isISBN = cleanSearch.length === 10 || cleanSearch.length === 13;

  // Auto-select when ISBN is scanned/typed — if found locally, select it;
  // if it's a 13-digit numeric ISBN (barcode scan) and not local, auto-lookup externally
  useEffect(() => {
    if (isISBN) {
      const found = allStock.find(
        (b) => b.isbn.replace(/[-\s]/g, "") === cleanSearch,
      );
      if (found) {
        setSelectedBook(found);
        setIsbnToLookup(""); // Clear any pending external lookup
      } else if (cleanSearch.length === 13 && /^\d+$/.test(cleanSearch)) {
        setIsbnToLookup(cleanSearch);
      }
    }
  }, [allStock, cleanSearch, isISBN]);

  // When lookup returns a result from external API, select it
  useEffect(() => {
    if (lookupResult && lookupResult.source !== "local") {
      setSelectedBook(lookupResult);
    }
  }, [lookupResult]);

  // Sync state when book is selected
  useEffect(() => {
    if (selectedBook) {
      // Default to 0 for adding/updating stock
      setQuantity(0);
      setLocation(selectedBook.location || "");
      setPrice(selectedBook.price?.toString() || "");
    } else {
      setQuantity(1);
      setLocation("");
      setPrice("");
    }
    setLocationError("");
  }, [selectedBook]);

  const validateLocation = (loc) => {
    const regex = /^[A-Z0-9]-[A-Z0-9]-[A-Z0-9]$/i;
    if (!loc) return "Location is required";
    if (!regex.test(loc)) return "Format must be X-X-X (Aisle-Row-Column)";
    return "";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isISBN) {
      // If book not found locally, trigger external lookup
      const found = allStock.find(
        (b) => b.isbn.replace(/[-\s]/g, "") === cleanSearch,
      );
      if (!found) {
        setIsbnToLookup(cleanSearch);
      }
    }
  };

  const handleLocationChange = (value) => {
    setLocation(value);
    setLocationError("");
  };

  const handleCancel = () => {
    setSearchQuery("");
    setSelectedBook(null);
    setIsbnToLookup("");
    setQuantity(1);
    setLocation("");
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleAddBook = async () => {
    if (!selectedBook) return;

    const error = validateLocation(location);
    if (error) {
      setLocationError(error);
      return;
    }

    try {
      await addBookMutation.mutateAsync({
        isbn: selectedBook.isbn,
        title: selectedBook.title,
        authors: selectedBook.authors || [],
        description: selectedBook.description || "",
        publisher: selectedBook.publisher || "",
        publishedDate: selectedBook.publishedDate || "",
        pageCount: selectedBook.pageCount || 0,
        categories: selectedBook.categories || [],
        coverUrl: selectedBook.coverUrl || "",
        stock: quantity,
        location: location.toUpperCase(),
        price: parseFloat(price) || 0,
      });

      // Highlight the book in the list
      setHighlightedISBN(selectedBook.isbn);
      setTimeout(() => setHighlightedISBN(null), 3000);

      // Clear panel and reset state
      setSearchQuery("");
      setSelectedBook(null);
      setIsbnToLookup("");
      setQuantity(1);
      setLocation("");
      setLocationError("");
      setPrice("");
    } catch (err) {
      console.error("Failed to add book:", err);
    }
  };

  const handleAdjustStock = async ({ stock, comment }) => {
    const updatedBook = await adjustStockMutation.mutateAsync({
      id: selectedBook.id,
      stock,
      comment,
    });
    setSelectedBook(updatedBook);
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
      setIsbnToLookup("");
      setQuantity(1);
      setLocation("");
      setLocationError("");
      setPrice("");
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  // Whether the selected book is from an external source (not yet in our DB)
  const isExternalBook =
    selectedBook &&
    (selectedBook.source === "google_books" ||
      selectedBook.source === "open_library");

  // Filter and paginate stock
  const filteredStock = allStock.filter((item) => {
    if (highlightedISBN && item.isbn === highlightedISBN) return true;
    if (highlightedISBN) return false;

    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.isbn.includes(query) ||
      item.authors.some((a) => a.toLowerCase().includes(query))
    );
  });

  const displayedStock = filteredStock.slice(0, page * ITEMS_PER_PAGE);

  // Reconnect when filtering or pagination changes the scroll target or counts.
  useEffect(() => {
    const target = observerTarget.current;
    if (
      isLoadingStock ||
      isStockError ||
      !target ||
      displayedStock.length >= filteredStock.length
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [displayedStock.length, filteredStock.length, isLoadingStock, isStockError]);

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

      <StockSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onKeyDown={handleKeyDown}
        showLookupHint={isISBN && !selectedBook}
      />

      {/* External Lookup Status */}
      {isLookingUp && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-blue-300 text-sm">
            Looking up ISBN in Google Books &amp; Open Library...
          </span>
        </div>
      )}

      {isLookupError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur p-4">
          <span className="text-red-300 text-sm">
            Failed to look up book. Please check the ISBN and try again.
          </span>
        </div>
      )}

      {isbnToLookup && !isLookingUp && !lookupResult && !isLookupError && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur p-4">
          <span className="text-amber-300 text-sm">
            No book found for ISBN "{isbnToLookup}" in any source.
          </span>
        </div>
      )}

      {selectedBook && (
        <SelectedBookCard
          key={selectedBook.id || selectedBook.isbn}
          selectedBook={selectedBook}
          isExternalBook={isExternalBook}
          quantity={quantity}
          onQuantityChange={setQuantity}
          location={location}
          locationError={locationError}
          onLocationChange={handleLocationChange}
          price={price}
          onPriceChange={setPrice}
          isSaving={
            isExternalBook
              ? addBookMutation.isPending
              : updateBookMutation.isPending
          }
          onSave={isExternalBook ? handleAddBook : handleUpdateStock}
          onCancel={handleCancel}
          onAdjustStock={handleAdjustStock}
          isAdjustingStock={adjustStockMutation.isPending}
        />
      )}

      <StockList
        totalBooks={allStock.length}
        displayedStock={displayedStock}
        selectedBook={selectedBook}
        highlightedISBN={highlightedISBN}
        onSelectBook={handleSelectBook}
        hasMore={displayedStock.length < filteredStock.length}
        observerTarget={observerTarget}
      />
    </div>
  );
}
