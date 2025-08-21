import BookOnShelf from "./BookOnShelf";

const bestSellers = [
  {
    isbn: "9781594485497",
    book_title: "Counterfeit Gods",
    author: "Timothy Keller",
    cover: "https://covers.openlibrary.org/b/isbn/9781594485497-M.jpg",
  },
  {
    isbn: "9781433544736",
    book_title: "The Things of Earth",
    author: "Joe Rigney",
    cover: "https://covers.openlibrary.org/b/isbn/9781433544736-M.jpg",
  },
  {
    isbn: "9780735222076",
    book_title: "Rediscovering Jonah: The Secret of God's Mercy",
    author: "Timothy Keller",
    cover: "https://covers.openlibrary.org/b/isbn/9780735222076-M.jpg",
  },
  {
    isbn: "9781433556272",
    book_title:
      "Living Life Backward: How Ecclesiastes Teaches Us to Live in Light of the End",
    author: "David Gibson",
    cover: "https://covers.openlibrary.org/b/isbn/9781433556272-M.jpg",
  },
  {
    isbn: "9780802416735",
    book_title:
      "Anatomy of an Affair: How Affairs, Attractions, and Addictions Develop, and How to Guard Your Marriage Against Them",
    author: "Dave Carder",
    cover: "https://covers.openlibrary.org/b/isbn/9780802416735-M.jpg",
  },
  {
    isbn: "9781596387409",
    book_title: "The Doctrines of Grace: Student Edition",
    author: "Shane Lems",
    cover:
      "https://books.google.com/books/content?id=5q_vnQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
  },
  {
    isbn: "9781433556739",
    book_title: "Redeeming Money: How God Reveals and Reorients Our Hearts",
    author: "Paul David Tripp",
    cover:
      "https://books.google.com/books/content?id=Z7feswEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
  },
  {
    isbn: "9781935273868",
    book_title: "What Do You Think of Me? Why Do I Care?",
    author: "Edward Welch",
    cover:
      "https://books.google.com/books/content?id=fJ3USAAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
  },
  {
    isbn: "9781629958071",
    book_title: "When People Are Big and God Is Small",
    author: "Edward Welch",
    cover:
      "https://books.google.com/books/content?id=9lWCzwEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
  },
  {
    isbn: "9781433515002",
    book_title: "What Is the Gospel?",
    author: "Greg Gilbert",
    cover: "https://covers.openlibrary.org/b/isbn/9781433515002-M.jpg",
    location: "1-3-4",
    stock: 2,
  },
  {
    isbn: "9781433543463",
    book_title: "Why Trust the Bible?",
    author: "Greg Gilbert",
    cover: "https://covers.openlibrary.org/b/isbn/9781433543463-M.jpg",
    location: "1-3-4",
    stock: 2,
  },
  {
    isbn: "9781433543500",
    book_title: "Who Is Jesus?",
    author: "Greg Gilbert",
    cover: "https://covers.openlibrary.org/b/isbn/9781433543500-M.jpg",
    location: "1-3-4",
    stock: 2,
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
  },
];

export default function BookShelf() {
  return (
    <div className="flex flex-wrap h-[300px] items-start justify-start py-3 px-2 rounded-xl bg-black/30 overflow-y-auto scrollbar-hide">
      {bestSellers.map((book) => (
        <BookOnShelf book={book} />
      ))}
    </div>
  );
}
