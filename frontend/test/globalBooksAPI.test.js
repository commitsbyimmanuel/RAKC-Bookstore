import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupBookByISBN, searchGlobalBooksByQuery } from "../src/services/globalBooksAPI.js";
import { bookEditionLabel, isAudioBook, latestBookEditions } from "../src/services/bookMetadata.js";

const work = { title: "Mere Christianity", author_name: ["C. S. Lewis"], isbn: ["0060652926", "9780060652920"], first_publish_year: 1952 };
const edition = { title: "Mere Christianity", authors: [{ name: "C. S. Lewis" }], physical_format: "Paperback", publish_date: "2015", isbn_13: ["9780060652920"] };
const googleBook = { volumeInfo: {
  title: "Mere Christianity", authors: ["C. S. Lewis"], publishedDate: "2015",
  industryIdentifiers: [{ type: "ISBN_13", identifier: "9780060652920" }],
} };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function mockProviders(t, { works = [work], editions = { "ISBN:9780060652920": { details: edition } }, googleItems = [], googleStatus = 429 } = {}) {
  return t.mock.method(globalThis, "fetch", async url => {
    const request = new URL(url);
    if (request.hostname === "www.googleapis.com") return json({ items: googleItems }, googleStatus);
    if (request.pathname === "/search.json") {
      assert.ok(request.searchParams.get("fields").split(",").includes("isbn"));
      return json({ docs: works });
    }
    assert.equal(request.pathname, "/api/books");
    assert.equal(request.searchParams.get("jscmd"), "details");
    return json(editions);
  });
}

test("title search uses edition metadata instead of the work's first publication year", async t => {
  const fetchMock = mockProviders(t);
  const results = await searchGlobalBooksByQuery("  Mere Christianity  ");
  assert.equal(results.length, 1);
  assert.equal(results[0].isbn, "9780060652920");
  assert.equal(results[0].publishedDate, "2015");
  assert.equal(results[0].format, "Paperback");
  assert.deepEqual(results[0].authors, ["C. S. Lewis"]);
  assert.equal(new URL(fetchMock.mock.calls[0].arguments[0]).searchParams.get("q"), "Mere Christianity");
  assert.equal(fetchMock.mock.callCount(), 3, "edition metadata is fetched in a single batch");
});

test("seeking allah returns the third print edition instead of audio and older editions", async t => {
  const authors = ["Nabeel Qureshi"];
  mockProviders(t, {
    works: [
      { title: "Seeking Allah, finding Jesus", author_name: authors, isbn: ["9781721334612", "9780310515029"], first_publish_year: 2014 },
      { title: "Seeking Allah, Finding Jesus", author_name: authors, isbn: ["9781721334605", "9781501262944", "9780310092643", "9780310092650"], first_publish_year: 2013 },
      { title: "Seeking Allah, Finding Jesus, 2nd Edition", author_name: authors, isbn: ["9780310527237"] },
    ],
    editions: {
      "ISBN:9781721334612": { details: { title: "Seeking Allah, finding Jesus", physical_format: "Audio book on compact disc", publish_date: "2018", edition_name: "3rd" } },
      "ISBN:9781721334605": { details: { title: "Seeking Allah, Finding Jesus", physical_format: "mp3 cd", publish_date: "2018" } },
      "ISBN:9781501262944": { details: { title: "Seeking Allah, Finding Jesus", physical_format: "CD-ROM", publish_date: "2013" } },
      "ISBN:9780310515029": { details: { title: "Seeking Allah, finding Jesus", physical_format: "Paperback", publish_date: "2014" } },
      "ISBN:9780310527237": { details: { title: "Seeking Allah, Finding Jesus, 2nd Edition", publish_date: "April 2016" } },
      "ISBN:9780310092643": { details: {
        title: "Seeking Allah, Finding Jesus", physical_format: "Paperback", publish_date: "2018", edition_name: "3rd ed. with bonus content, new reflections",
        // The real catalogue record mixes the ebook ISBN-13 with the print ISBN-10.
        isbn_13: ["9780310092650"], isbn_10: ["0310092647"], number_of_pages: 384,
      } },
      "ISBN:9780310092650": { details: {
        title: "Seeking Allah, Finding Jesus", physical_format: "Paperback", publish_date: "2018", edition_name: "3rd ed. with bonus content, new reflections",
        isbn_13: ["9780310092650"], isbn_10: ["0310092647"],
      } },
    },
  });
  const results = await searchGlobalBooksByQuery("seeking allah");
  assert.equal(results.length, 1);
  assert.equal(results[0].isbn, "9780310092643");
  assert.equal(results[0].pageCount, 384);
  assert.equal(bookEditionLabel(results[0]), "Paperback · 3rd edition · 2018");
});

test("author searches retain Google matches when Open Library is unavailable", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("openlibrary.org")) throw new TypeError("Network unavailable");
    assert.equal(new URL(url).searchParams.get("q"), "C. S. Lewis");
    return json({ items: [googleBook] });
  });
  const results = await searchGlobalBooksByQuery("C. S. Lewis");
  assert.equal(results.length, 1);
  assert.equal(results[0].source, "google_books");
  assert.equal(results[0].format, "", "a print format is not invented when missing");
});

test("duplicate ISBNs and results without a requestable ISBN are excluded", async t => {
  mockProviders(t, { googleStatus: 200, googleItems: [
    { volumeInfo: { ...googleBook.volumeInfo, industryIdentifiers: [{ type: "ISBN_13", identifier: "978-0-06-065292-0" }] } },
    { volumeInfo: { title: "No ISBN" } },
  ] });
  const results = await searchGlobalBooksByQuery("Mere Christianity");
  assert.equal(results.length, 1);
  assert.equal(results[0].isbn, "9780060652920");
});

test("Google matches are also checked against audio edition metadata", async t => {
  mockProviders(t, { works: [], googleStatus: 200, googleItems: [googleBook], editions: {
    "ISBN:9780060652920": { details: { ...edition, physical_format: "Audio CD" } },
  } });
  assert.deepEqual(await searchGlobalBooksByQuery("Mere Christianity"), []);
});

test("audio filtering detects media and audio publishers without rejecting books about audio", () => {
  for (const book of [
    { format: "MP3 CD" }, { physical_format: "Audio book on compact disc" },
    { pagination: "7 sound discs", publisher: "Brilliance Audio" }, { format: "CD-ROM" },
    { format: "Cassette" }, { title: "A Book (Audiobook)" },
  ]) assert.equal(isAudioBook(book), true);
  assert.equal(isAudioBook({ title: "Audio Engineering", format: "Paperback" }), false);
});

test("latest editions use edition number then year, keeping other authors and study guides separate", () => {
  const book = { title: "A Book", authors: ["An Author"], isbn: "1", publishedDate: "2020" };
  const newer = { ...book, isbn: "2", publishedDate: "2024" };
  const second = { ...book, title: "A Book, 2nd Edition", isbn: "3", publishedDate: "2023" };
  const otherAuthor = { ...book, authors: ["Other Author"], isbn: "4" };
  const guide = { ...book, title: "A Book Study Guide", isbn: "5" };
  assert.deepEqual(latestBookEditions([book, newer]), [newer]);
  assert.deepEqual(latestBookEditions([book, second, otherAuthor, guide]), [second, otherAuthor, guide]);
  assert.equal(latestBookEditions([{ ...book, authors: [] }, { ...newer, authors: [] }]).length, 2);
});

test("provider outages are reported instead of appearing as no matches", async t => {
  t.mock.method(globalThis, "fetch", async () => json({}, 503));
  await assert.rejects(searchGlobalBooksByQuery("Mere Christianity"), /unavailable/);
});

test("empty matches and short input remain valid empty searches", async t => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => json({}));
  for (const query of [undefined, "", "   ", " ab "]) assert.deepEqual(await searchGlobalBooksByQuery(query), []);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(await searchGlobalBooksByQuery("unknown title"), []);
});

test("cancelled searches propagate cancellation", async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    assert.equal(signal, controller.signal);
    controller.abort();
    signal.throwIfAborted();
  });
  await assert.rejects(searchGlobalBooksByQuery("Mere Christianity", controller.signal), { name: "AbortError" });
});

test("ISBN lookup still prefers local inventory and its stock count", async t => {
  const fetchMock = t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url, "/api/books?isbn=9780060652920");
    return json([{ isbn: "9780060652920", title: "Mere Christianity", stock: 2 }]);
  });
  const book = await lookupBookByISBN("978-0-06-065292-0");
  assert.equal(book.source, "local");
  assert.equal(book.stock, 2);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("ISBN lookup falls back to edition details and excludes audio", async t => {
  let audio = false;
  t.mock.method(globalThis, "fetch", async url => {
    if (url.startsWith("/api/")) return json([]);
    if (url.includes("googleapis.com")) return json({}, 429);
    return json({ "ISBN:9780060652920": { details: { ...edition, physical_format: audio ? "MP3 CD" : "Paperback" } } });
  });
  const book = await lookupBookByISBN("9780060652920");
  assert.equal(book.source, "open_library");
  assert.equal(book.format, "Paperback");
  assert.equal(book.publishedDate, "2015");
  audio = true;
  assert.equal(await lookupBookByISBN("9780060652920"), null);
});
