import BookOnShelf from "../../ui/BookOnShelf";

export default function StockList({
  totalBooks,
  displayedStock,
  selectedBook,
  highlightedISBN,
  onSelectBook,
  hasMore,
  observerTarget,
}) {
  return (
    <div className="flex-1">
      <h2 className="text-lg font-semibold text-white mb-4 font-mono tracking-tight uppercase">
        Current Stock ({totalBooks} books)
      </h2>

      {totalBooks === 0 && (
        <div className="flex justify-center items-center w-full h-[20vh] text-white/40">
          No books in stock. Start adding some!
        </div>
      )}

      <div className="space-y-2">
        {displayedStock.map((entry) => (
          <div
            key={entry.isbn}
            onClick={() => onSelectBook(entry)}
            className={`py-3 px-4 items-center flex justify-between rounded-2xl cursor-pointer transition-all ${
              entry.isbn === highlightedISBN
                ? "bg-orange-500/20 border border-orange-500/40"
                : entry === selectedBook
                  ? "bg-white/20 border border-white/40 ring-1 ring-white/20"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <BookOnShelf book={entry} />
              <div className="min-w-[400px]">
                <div className="text-lg font-medium text-white">
                  {entry.title}
                </div>
                <div className="text-sm text-white/60">
                  {entry.authors?.join(", ")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {entry.stock > 0 && (
                <div className="text-center text-sm text-white/70">
                  <div className="text-xs text-white/40 uppercase tracking-wide mb-1">
                    Location
                  </div>
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
        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-white/40">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
