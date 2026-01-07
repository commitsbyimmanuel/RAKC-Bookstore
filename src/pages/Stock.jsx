import BookOnShelf from "../ui/BookOnShelf";
import { useBooks } from "../services/localAPI";

export default function Stock() {
  const { data: stock = [], isLoading, isError } = useBooks();

  if (isLoading) {
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

  if (isError) {
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
    <div className="w-full h-full">
      <h1 className="text-2xl mb-3">Stock</h1>
      {stock.length === 0 && (
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="text-center">
            No books at the store? 😲 Time to stock up!
          </div>
        </div>
      )}
      <div className="divide-y-1">
        {stock.map((entry) => (
          <div
            key={entry.isbn}
            className="py-1 items-center flex justify-between"
          >
            <div className="flex justify-left">
              <BookOnShelf book={entry} />
              <div className="flex-col w-[500px]">
                <div className="text-lg pl-4">{entry.title}</div>
                <div className="text-sm pl-4">{entry.authors?.join(", ")}</div>
              </div>
            </div>

            {entry.stock > 0 ? (
              <div className="text-center">
                Find it at:
                <br />
                {entry.location}
              </div>
            ) : (
              ""
            )}

            <div>
              {entry.stock === 0 ? (
                <div className="bg-red-700 rounded-full p-1 px-2 w-30 text-center">
                  Out of Stock
                </div>
              ) : (
                <div
                  className={`${
                    entry.stock === 1 ? "bg-amber-700" : "bg-green-700"
                  } rounded-full p-1 px-2 w-30 text-center`}
                >
                  {`${entry.stock} In Stock`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

