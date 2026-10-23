export default function StockSearchBar({
  searchQuery,
  onSearchChange,
  onKeyDown,
  showLookupHint,
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search by title, author, or ISBN..."
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-2
                   text-white placeholder:text-white/30 focus:outline-none
                   focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all font-mono text-sm shadow-inner"
        autoFocus
      />
      {showLookupHint && (
        <p className="text-xs text-white/40 mt-2 ml-1">
          Press Enter to look up this ISBN from Google Books / Open Library
        </p>
      )}
    </div>
  );
}
