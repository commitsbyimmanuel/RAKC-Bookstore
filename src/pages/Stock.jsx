import BookOnShelf from "../ui/BookOnShelf";

const stock = [
  {
    isbn: "9781594485497",
    book_title: "Counterfeit Gods",
    author: "Timothy Keller",
    cover: "https://covers.openlibrary.org/b/isbn/9781594485497-M.jpg",
    stock: 3,
    location: "2-3-4",
  },
  {
    isbn: "9781433544736",
    book_title: "The Things of Earth",
    author: "Joe Rigney",
    cover: "https://covers.openlibrary.org/b/isbn/9781433544736-M.jpg",
    stock: 2,
    location: "1-1-1",
  },
  {
    isbn: "9780735222076",
    book_title: "Rediscovering Jonah: The Secret of God's Mercy",
    author: "Timothy Keller",
    cover: "https://covers.openlibrary.org/b/isbn/9780735222076-M.jpg",
    stock: 1,
    location: "1-2-1",
  },
  {
    isbn: "9781433556272",
    book_title:
      "Living Life Backward: How Ecclesiastes Teaches Us to Live in Light of the End",
    author: "David Gibson",
    cover: "https://covers.openlibrary.org/b/isbn/9781433556272-M.jpg",
    stock: 2,
    location: "1-3-1",
  },
  {
    isbn: "9780802416735",
    book_title:
      "Anatomy of an Affair: How Affairs, Attractions, and Addictions Develop, and How to Guard Your Marriage Against Them",
    author: "Dave Carder",
    cover: "https://covers.openlibrary.org/b/isbn/9780802416735-M.jpg",
    stock: 0,
    location: "1-6-3",
  },
  {
    isbn: "9781596387409",
    book_title: "The Doctrines of Grace: Student Edition",
    author: "Shane Lems",
    cover:
      "https://books.google.com/books/content?id=5q_vnQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    stock: 5,
    location: "1-6-4",
  },
  {
    isbn: "9781433556739",
    book_title: "Redeeming Money: How God Reveals and Reorients Our Hearts",
    author: "Paul David Tripp",
    cover:
      "https://books.google.com/books/content?id=Z7feswEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    stock: 5,
    location: "1-2-1",
  },
  {
    isbn: "9781935273868",
    book_title: "What Do You Think of Me? Why Do I Care?",
    author: "Edward Welch",
    cover:
      "https://books.google.com/books/content?id=fJ3USAAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    stock: 1,
    location: "1-2-2",
  },
  {
    isbn: "9781629958071",
    book_title: "When People Are Big and God Is Small",
    author: "Edward Welch",
    cover:
      "https://books.google.com/books/content?id=9lWCzwEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    stock: 0,
    location: "1-2-4",
  },
  {
    isbn: "9781433515002",
    book_title: "What Is the Gospel?",
    author: "Greg Gilbert",
    cover: "https://covers.openlibrary.org/b/isbn/9781433515002-M.jpg",
    location: "1-3-1",
    stock: 20,
  },
  {
    isbn: "9781433543463",
    book_title: "Why Trust the Bible?",
    author: "Greg Gilbert",
    cover: "https://covers.openlibrary.org/b/isbn/9781433543463-M.jpg",
    location: "1-3-5",
    stock: 10,
  },
  {
    isbn: "9781433543500",
    book_title: "Who Is Jesus?",
    author: "Greg Gilbert",
    cover: "https://covers.openlibrary.org/b/isbn/9781433543500-M.jpg",
    location: "1-3-6",
    stock: 15,
  },
  {
    isbn: "9781433587269",
    book_title: "Knowing God",
    author: "J. I. Packer",
    cover: "https://covers.openlibrary.org/b/isbn/9781433587269-M.jpg",
    location: "1-3-4",
    stock: 2,
  },
  {
    isbn: "9781922206732",
    book_title: "Then Sings My Soul",
    author: "Philip Percival",
    cover: "https://m.media-amazon.com/images/I/81nPCeHYsmL.jpg",
    location: "1-3-8",
    stock: 1,
  },
];

export default function Stock() {
  return (
    <div className="w-full h-full">
      <h1 className="text-2xl mb-3">Stock</h1>
      {stock.length == 0 && (
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
              {/* <img src={entry.cover} className="w-15" /> */}
              <BookOnShelf book={entry} />
              <div className="flex-col w-[500px]">
                <div className="text-lg pl-4">{entry.book_title}</div>
                <div className="text-sm pl-4">{entry.author}</div>
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
                  {`Out of Stock`}
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
