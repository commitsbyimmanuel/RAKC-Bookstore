const LOCAL_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_API_URL = "https://openlibrary.org/api/books";
const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org/b/isbn";

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
    const volumeInfo = data.items?.[0]?.volumeInfo;
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
async function searchLocalDB(isbn) {
  try {
    const response = await fetch(`${LOCAL_API_URL}/books?isbn=${isbn}`);
    if (!response.ok) return null;
    
    const books = await response.json();
    if (books.length === 0) return null;
    
    return normalizeBookData(books[0], "local");
  } catch (error) {
    console.warn("Local DB lookup failed:", error.message);
    return null;
  }
}

/**
 * Search Google Books API
 */
async function searchGoogleBooks(isbn) {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API_URL}?q=isbn:${isbn}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.totalItems === 0) return null;
    
    return normalizeBookData(data, "google_books");
  } catch (error) {
    console.warn("Google Books lookup failed:", error.message);
    return null;
  }
}

/**
 * Search Open Library API
 */
async function searchOpenLibrary(isbn) {
  try {
    const response = await fetch(
      `${OPEN_LIBRARY_API_URL}?bibkeys=ISBN:${isbn}&jscmd=data&format=json`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    if (Object.keys(data).length === 0) return null;
    
    return normalizeBookData(data, "open_library");
  } catch (error) {
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
export async function lookupBookByISBN(isbn) {
  if (!isbn || isbn.length < 10) {
    throw new Error("Invalid ISBN: must be at least 10 characters");
  }

  // Clean the ISBN (remove dashes and spaces)
  const cleanISBN = isbn.replace(/[-\s]/g, "");

  // 1. Try local database first
  const localResult = await searchLocalDB(cleanISBN);
  if (localResult) {
    console.log(`Book found in local DB: ${localResult.title}`);
    return localResult;
  }

  // 2. Try Google Books API
  const googleResult = await searchGoogleBooks(cleanISBN);
  if (googleResult) {
    console.log(`Book found via Google Books: ${googleResult.title}`);
    return googleResult;
  }

  // 3. Try Open Library API
  const openLibraryResult = await searchOpenLibrary(cleanISBN);
  if (openLibraryResult) {
    console.log(`Book found via Open Library: ${openLibraryResult.title}`);
    return openLibraryResult;
  }

  // Not found anywhere
  return null;
}

export default lookupBookByISBN;
