const fs = require("fs");

async function fetchCover(isbn, apiKey) {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`
  );
  const data = await res.json();
  const vol = data.items?.[0]?.volumeInfo;
  if (!vol?.imageLinks) return null;
  const img = vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail;
  return img ? img.replace(/^http:\/\//, "https://") : null;
}

async function enrichCovers(books, apiKey) {
  return Promise.all(
    books.map(async (b) => {
      const already = b.cover?.includes("covers.openlibrary");
      if (already) return b;
      const googleCover = await fetchCover(b.isbn, apiKey);
      return {
        ...b,
        cover: googleCover || b.cover,
      };
    })
  );
}

const books = [
  {
    isbn: "9781739706272",
    book_title: "Priscilla, Where Are You? A Call to Joyful Theology",
    author: "Natalie Brand",
    cover: "",
  },
  {
    isbn: "9781596387409",
    book_title: "The Doctrines of Grace: Student Edition",
    author: "Shane Lems",
    cover: "",
  },
  {
    isbn: "9781433556739",
    book_title: "Redeeming Money: How God Reveals and Reorients Our Hearts",
    author: "Paul David Tripp",
    cover: "",
  },
  {
    isbn: "9781935273868",
    book_title: "What Do You Think of Me? Why Do I Care?",
    author: "Edward Welch",
    cover: "",
  },
  {
    isbn: "9781629958071",
    book_title: "When People Are Big and God Is Small",
    author: "Edward Welch",
    cover: "",
  },
  {
    isbn: "9781922206732",
    book_title: "Then Sings My Soul",
    author: "Philip Percival",
    cover: "",
  },
];

const enrichedBooks = enrichCovers(books, "");
enrichedBooks.then((result) => {
  fs.writeFileSync("./enrichedBooks.json", JSON.stringify(result, null, 2));
});
