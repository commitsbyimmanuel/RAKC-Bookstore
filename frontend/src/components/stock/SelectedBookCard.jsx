import { useState } from "react";
import Button from "../../ui/Button";
import AdjustStockModal from "./AdjustStockModal";

export default function SelectedBookCard({
  selectedBook,
  isExternalBook,
  quantity,
  onQuantityChange,
  location,
  locationError,
  onLocationChange,
  price,
  onPriceChange,
  isSaving,
  onSave,
  onCancel,
  onAdjustStock,
  isAdjustingStock,
}) {
  const [showAdjustStock, setShowAdjustStock] = useState(false);

  return (
    <>
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              {isExternalBook ? (
                <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-blue-500/20 text-blue-400">
                  NEW —{" "}
                  {selectedBook.source === "google_books"
                    ? "Google Books"
                    : "Open Library"}
                </span>
              ) : (
                <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-green-500/20 text-green-400">
                  IN STOCK
                </span>
              )}
              {!isExternalBook && (
                <Button
                  variant="secondary"
                  onClick={() => setShowAdjustStock(true)}
                  disabled={isSaving || isAdjustingStock}
                  className="h-auto px-4 py-2 text-sm"
                >
                  Adjust stock
                </Button>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {selectedBook.title}
            </h3>
            <p className="text-sm text-white/60 mb-4">
              {selectedBook.authors?.join(", ")}
            </p>

            <div className="grid gap-3 grid-cols-4">
              {/* Quantity Control */}
              <div>
                <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                  {isExternalBook ? "Stock" : "New Stock"}
                </label>
                <div className="flex w-full justify-between gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/20">
                  <button
                    onClick={() =>
                      onQuantityChange((prev) => Math.max(prev - 1, 0))
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/20 text-white transition-all"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      onQuantityChange(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="text-lg font-mono text-white w-16 text-center bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                  <button
                    onClick={() => onQuantityChange((prev) => prev + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/20 text-white transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Current Stock Display */}
              {!isExternalBook && (
                <div>
                  <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                    Current Stock
                  </label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 h-[46px] flex items-center justify-center text-white/70 font-mono text-lg">
                    {selectedBook.stock}
                  </div>
                </div>
              )}

              {/* Location Input */}
              <div>
                <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => onLocationChange(e.target.value)}
                  placeholder="X-X-X"
                  className={`w-full bg-white/5 border rounded-2xl px-4 h-[46px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all shadow-inner ${
                    locationError
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/10 focus:ring-white/10 focus:bg-white/10"
                  }`}
                />
                {locationError && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-tight">
                    {locationError}
                  </p>
                )}
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-2">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                    AED
                  </span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => onPriceChange(e.target.value)}
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
                onClick={onCancel}
                className="flex-1 h-12"
              >
                Cancel
              </Button>

              {isExternalBook ? (
                <Button
                  variant="primary"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex-[2] h-12"
                >
                  {isSaving ? "Adding..." : "Add to Stock"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex-[2] h-12"
                >
                  {isSaving ? "Updating..." : "Update Stock & Location"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {showAdjustStock && (
        <AdjustStockModal
          book={selectedBook}
          onClose={() => setShowAdjustStock(false)}
          onSubmit={onAdjustStock}
          isSaving={isAdjustingStock}
        />
      )}
    </>
  );
}
