export default function BookOnShelf({ book }) {
  // Support both old and new field names for backwards compatibility
  const coverUrl = book.coverUrl || book.cover;
  const title = book.title || book.book_title;

  return (
    <div
      key={book.isbn}
      className="relative mx-3 my-[5px] w-[77px] h-[110px] flex-shrink-0 group"
    >
      <img
        src={coverUrl}
        alt={title}
        className="w-full h-full object-cover rounded-sm drop-shadow-[3px_4px_10px_rgba(0,0,0,0.8)]"
      />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 z-10">
        <p className="font-semibold">{`In Stock: ${book.stock}`}</p>
        {book.location && (
          <p className="text-gray-400 text-[10px]">📍 {book.location}</p>
        )}
      </div>
    </div>
  );
}

