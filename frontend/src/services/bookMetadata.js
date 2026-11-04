export function isAudioBook(book) {
  const media = [book.format, book.physical_format, book.publisher, ...(book.publishers || []), book.pagination].join(" ");
  return /\b(audio|audiobooks?|mp3|cd(?:-rom)?|cassettes?|compact discs?|sound recording|audible)\b/i.test(media)
    || /\b(audio\s*books?|audio\s+cd|mp3|sound recording)\b/i.test(`${book.title || ""} ${book.subtitle || ""}`);
}

export function bookEditionLabel(book) {
  const edition = book.edition || book.title?.match(/\b\d+(?:st|nd|rd|th)\s+edition\b/i)?.[0] || "";
  const numberedEdition = edition.match(/^(\d+(?:st|nd|rd|th))\b/i);
  const year = book.publishedDate?.match(/\b\d{4}\b/)?.[0];
  return [book.format || "Format unavailable", numberedEdition ? `${numberedEdition[1]} edition` : edition, year].filter(Boolean).join(" · ");
}

function editionNumber(book) {
  const label = `${book.edition || ""} ${book.title || ""}`;
  const number = label.match(/\b(\d+)(?:st|nd|rd|th)?\s*(?:ed\b|edition\b)/i)
    || label.match(/^\s*(\d+)(?:st|nd|rd|th)\b/i);
  return Number(number?.[1] || 0);
}

function titleKey(book) {
  return (book.title || "")
    .replace(/\b\d+(?:st|nd|rd|th)?\s*(?:edition\b|ed\.).*$/i, "")
    .replace(/\b(?:expanded|revised|updated)\s+edition\b.*$/i, "")
    .toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function latestBookEditions(books) {
  const latest = new Map();
  for (const book of books) {
    if (isAudioBook(book)) continue;
    const author = book.authors?.[0]?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    // Missing author/title data is insufficient to merge unrelated records.
    const key = author && titleKey(book) ? `${titleKey(book)}:${author}` : book.isbn;
    const current = latest.get(key);
    const rank = candidate => [editionNumber(candidate), Number(candidate.publishedDate?.match(/\b\d{4}\b/)?.[0] || 0)];
    const [edition, year] = rank(book);
    const [oldEdition, oldYear] = current ? rank(current) : [-1, -1];
    if (!current || edition > oldEdition || (edition === oldEdition && year > oldYear)) latest.set(key, book);
  }
  return [...latest.values()];
}
