import { API_URL, apiFetch } from "./apiClient.js";
import { isAudioBook, latestBookEditions } from "./bookMetadata.js";

const LOCAL_API_URL = API_URL;
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_API_URL = "https://openlibrary.org/api/books";
const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org/b/isbn";

function cleanISBN(isbn) {
  return isbn?.replace(/[-\s]/g, "").toUpperCase();
}

function isbn13From10(isbn) {
  const clean = cleanISBN(isbn);
  if (!/^\d{9}[\dX]$/.test(clean)) return null;
  const prefix = `978${clean.slice(0, 9)}`;
  const sum = [...prefix].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${prefix}${(10 - sum % 10) % 10}`;
}

function normalizeOpenLibraryEdition(data, isbn, work = {}) {
  // Prefer the equivalent ISBN-13 when the catalogue also supplies its ISBN-10.
  // Some records have an unrelated ebook ISBN in their ISBN-13 field.
  const equivalents = (data.isbn_10 || []).map(isbn13From10).filter(Boolean);
  const identifiers = (data.isbn_13 || []).map(cleanISBN);
  const canonicalISBN = identifiers.find(id => equivalents.includes(id)) || equivalents[0] || cleanISBN(isbn);
  return {
    isbn: canonicalISBN,
    title: data.title || work.title || "",
    subtitle: data.subtitle || "",
    authors: work.author_name || data.authors?.map(author => author.name).filter(Boolean) || [],
    description: typeof data.description === "string" ? data.description : data.description?.value || "",
    publisher: data.publishers?.[0] || "",
    publishers: data.publishers || [],
    publishedDate: data.publish_date || "",
    format: data.physical_format || "",
    edition: data.edition_name || "",
    pagination: data.pagination || "",
    pageCount: data.number_of_pages || 0,
    categories: data.subjects?.slice(0, 3) || [],
    coverUrl: data.covers?.find(id => id > 0)
      ? `https://covers.openlibrary.org/b/id/${data.covers.find(id => id > 0)}-M.jpg`
      : `${OPEN_LIBRARY_COVERS_URL}/${canonicalISBN}-M.jpg`,
    stock: null,
    location: null,
    source: "open_library",
  };
}

/**
 * Normalize book data from different sources into a consistent format
 */
function normalizeBookData(data, source) {
  if (source === "local") {
    return {
      ...data,
      source: "local",
    };
  }

  if (source === "google_books") {
    const volumeInfo = data.items ? data.items[0]?.volumeInfo : data.volumeInfo;
    if (!volumeInfo) return null;

    const imageLinks = volumeInfo.imageLinks || {};
    const coverUrl = (imageLinks.thumbnail || imageLinks.smallThumbnail || "")
      .replace(/^http:\/\//, "https://");

    return {
      isbn: volumeInfo.industryIdentifiers?.find(id => id.type === "ISBN_13")?.identifier ||
            volumeInfo.industryIdentifiers?.find(id => id.type === "ISBN_10")?.identifier,
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle || "",
      authors: volumeInfo.authors || [],
      description: volumeInfo.description || "",
      publisher: volumeInfo.publisher || "",
      publishedDate: volumeInfo.publishedDate || "",
      format: volumeInfo.physical_format || "",
      edition: volumeInfo.edition || "",
      pageCount: volumeInfo.pageCount || 0,
      categories: volumeInfo.categories || [],
      coverUrl,
      stock: null, // Not in our local DB
      location: null,
      source: "google_books",
    };
  }

  if (source === "open_library") {
    const key = Object.keys(data)[0];
    const bookData = data[key];
    if (!bookData) return null;

    const isbn = key.replace("ISBN:", "");
    if (bookData.details) return normalizeOpenLibraryEdition(bookData.details, isbn);
    
    return {
      isbn,
      title: bookData.title || "",
      subtitle: bookData.subtitle || "",
      authors: bookData.authors?.map(a => a.name) || [],
      description: bookData.notes || "",
      publisher: bookData.publishers?.[0]?.name || "",
      publishedDate: bookData.publish_date || "",
      pageCount: bookData.number_of_pages || 0,
      categories: bookData.subjects?.map(s => s.name) || [],
      coverUrl: `${OPEN_LIBRARY_COVERS_URL}/${isbn}-M.jpg`,
      stock: null,
      location: null,
      source: "open_library",
    };
  }

  return null;
}

/**
 * Search local json-server database
 */
async function searchLocalDB(isbn, signal) {
  try {
    signal?.throwIfAborted();
    const response = await apiFetch(`${LOCAL_API_URL}/books?isbn=${isbn}`, { signal });
    if (!response.ok) return null;
    
    const books = await response.json();
    signal?.throwIfAborted();
    if (books.length === 0) return null;
    
    return normalizeBookData(books[0], "local");
  } catch (error) {
    signal?.throwIfAborted();
    if (error.name === "AbortError") throw error;
    console.warn("Local DB lookup failed:", error.message);
    return null;
  }
}

/**
 * Search Google Books API
 */
async function searchGoogleBooks(isbn, signal) {
  try {
    signal?.throwIfAborted();
    const response = await fetch(`${GOOGLE_BOOKS_API_URL}?q=isbn:${isbn}`, { signal });
    if (!response.ok) return null;
    
    const data = await response.json();
    signal?.throwIfAborted();
    if (data.totalItems === 0) return null;
    
    const book = normalizeBookData(data, "google_books");
    return book && !isAudioBook(book) ? book : null;
  } catch (error) {
    signal?.throwIfAborted();
    if (error.name === "AbortError") throw error;
    console.warn("Google Books lookup failed:", error.message);
    return null;
  }
}

/**
 * Search Open Library API
 */
async function searchOpenLibrary(isbn, signal) {
  try {
    signal?.throwIfAborted();
    const response = await fetch(
      `${OPEN_LIBRARY_API_URL}?bibkeys=ISBN:${isbn}&jscmd=details&format=json`,
      { signal },
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    signal?.throwIfAborted();
    if (Object.keys(data).length === 0) return null;
    
    const book = normalizeBookData(data, "open_library");
    return book && !isAudioBook(book) ? book : null;
  } catch (error) {
    signal?.throwIfAborted();
    if (error.name === "AbortError") throw error;
    console.warn("Open Library lookup failed:", error.message);
    return null;
  }
}

/**
 * Main lookup function with cascading fallback:
 * 1. Local DB (json-server simulating MongoDB)
 * 2. Google Books API
 * 3. Open Library API
 * 
 * @param {string} isbn - The ISBN to lookup
 * @returns {Promise<Object|null>} - Normalized book data with source, or null if not found
 */
export async function lookupBookByISBN(isbn, signal) {
  signal?.throwIfAborted();
  if (!isbn || isbn.length < 10) {
    throw new Error("Invalid ISBN: must be at least 10 characters");
  }

  // Clean the ISBN (remove dashes and spaces)
  const cleanISBN = isbn.replace(/[-\s]/g, "");

  // 1. Try local database first
  const localResult = await searchLocalDB(cleanISBN, signal);
  signal?.throwIfAborted();
  if (localResult) {
    console.log(`Book found in local DB: ${localResult.title}`);
    return localResult;
  }

  // 2. Try Google Books API
  const googleResult = await searchGoogleBooks(cleanISBN, signal);
  signal?.throwIfAborted();
  if (googleResult) {
    console.log(`Book found via Google Books: ${googleResult.title}`);
    return googleResult;
  }

  // 3. Try Open Library API
  const openLibraryResult = await searchOpenLibrary(cleanISBN, signal);
  signal?.throwIfAborted();
  if (openLibraryResult) {
    console.log(`Book found via Open Library: ${openLibraryResult.title}`);
    return openLibraryResult;
  }

// Not found anywhere
  return null;
}

/**
 * Search Google Books and Open Library by title or author.
 * @param {string} query - The search query (title, author, etc.)
 * @param {AbortSignal} signal - AbortSignal to cancel fetch
 * @returns {Promise<Array>} - List of normalized book data
 */
export async function searchGlobalBooksByQuery(query, signal) {
  const searchQuery = query?.trim();
  if (!searchQuery || searchQuery.length < 3) return [];

  const fetchData = async (url) => {
    signal?.throwIfAborted();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Book search failed (${response.status})`);
    const data = await response.json();
    signal?.throwIfAborted();
    return data;
  };

  // Open Library no longer includes ISBNs in its default search fields.
  // Search finds groups of editions. Expand their ISBNs, then fetch edition
  // metadata in one batch instead of picking an arbitrary ISBN from each group.
  const fields = "key,title,author_name,isbn";
  const responses = await Promise.allSettled([
    fetchData(`${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(searchQuery)}&maxResults=8&printType=books`),
    fetchData(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=8&fields=${fields}`),
  ]);

  signal?.throwIfAborted();
  if (responses.every(response => response.status === "rejected")) {
    throw new Error("Internet book search is unavailable. Please try again shortly.");
  }

  const googleBooks = responses[0].status === "fulfilled"
    ? (responses[0].value.items || []).map(item => normalizeBookData(item, "google_books")).filter(Boolean)
    : [];
  const works = responses[1].status === "fulfilled" ? responses[1].value.docs || [] : [];
  const candidates = new Map();
  for (const work of works) {
    const identifiers = [...new Set((work.isbn || []).map(cleanISBN).filter(Boolean))];
    const isbn13s = identifiers.filter(isbn => /^\d{13}$/.test(isbn));
    const selected = isbn13s.length ? isbn13s : identifiers.filter(isbn => /^\d{9}[\dX]$/.test(isbn));
    // Bound the batch while retaining several editions for every matching title.
    for (const isbn of selected.slice(0, 8)) {
      if (!candidates.has(isbn)) candidates.set(isbn, work);
    }
  }
  const allISBNs = [...new Set([...candidates.keys(), ...googleBooks.map(book => cleanISBN(book.isbn)).filter(Boolean)])];
  let editionData = {};
  if (allISBNs.length) {
    try {
      const bibkeys = allISBNs.map(isbn => `ISBN:${isbn}`).join(",");
      editionData = await fetchData(`${OPEN_LIBRARY_API_URL}?bibkeys=${bibkeys}&jscmd=details&format=json`);
    } catch (error) {
      signal?.throwIfAborted();
      if (!googleBooks.length) throw error;
    }
  }

  const results = new Map();
  const addBook = (book) => {
    if (!book || isAudioBook(book)) return;
    const isbn = cleanISBN(book.isbn);
    if (isbn && !results.has(isbn)) results.set(isbn, { ...book, isbn });
  };
  for (const book of googleBooks) {
    const isbn = cleanISBN(book.isbn);
    const details = editionData[`ISBN:${isbn}`]?.details;
    addBook(details ? normalizeOpenLibraryEdition(details, isbn, { author_name: book.authors }) : book);
  }
  for (const [isbn, work] of candidates) {
    const details = editionData[`ISBN:${isbn}`]?.details;
    if (details) addBook(normalizeOpenLibraryEdition(details, isbn, work));
  }

  return latestBookEditions([...results.values()]);
}

export default lookupBookByISBN;
