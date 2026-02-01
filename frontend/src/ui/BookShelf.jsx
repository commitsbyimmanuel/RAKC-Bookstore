import { useTopSellers } from "../services/localAPI";
import BookOnShelf from "./BookOnShelf";

export default function BookShelf() {
  const { data: topSellers = [], isLoading, isError } = useTopSellers(14);

  if (isLoading) {
    return (
      <div className="flex flex-wrap h-[300px] items-center justify-center py-3 px-2 rounded-xl bg-black/30">
        <div className="flex items-center gap-2 text-white/60">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading best sellers...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-wrap h-[300px] items-center justify-center py-3 px-2 rounded-xl bg-black/30">
        <div className="text-center text-red-400">
          Failed to load best sellers
        </div>
      </div>
    );
  }

  if (topSellers.length === 0) {
    return (
      <div className="flex flex-wrap h-[300px] items-center justify-center py-3 px-2 rounded-xl bg-black/30">
        <div className="text-center text-white/40">
          No sales data yet. Start making sales to see best sellers!
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap h-[300px] items-start justify-start py-3 px-2 rounded-xl bg-black/30 overflow-y-auto scrollbar-hide">
      {topSellers.map((book) => (
        <BookOnShelf 
          book={{
            isbn: book.isbn,
            book_title: book.title,
            author: book.authors?.join(", "),
            cover: book.coverUrl,
          }} 
          key={book.isbn} 
        />
      ))}
    </div>
  );
}
