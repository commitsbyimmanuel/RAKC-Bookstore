import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { activeBookSearchQuery, bookLookupQueryOptions, globalBookSearchQueryOptions } from "../src/hooks/useBookLookup.js";
import { localBookSearchQueryOptions } from "../src/services/localAPI.js";
import { lookupBookByISBN } from "../src/services/globalBooksAPI.js";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(predicate) {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (predicate()) return;
    await tick();
  }
  assert.fail("Timed out waiting for query state");
}

function observe(t, options) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const observer = new QueryObserver(client, options);
  const updates = [];
  const unsubscribe = observer.subscribe(result => updates.push(result));
  t.after(() => { unsubscribe(); client.clear(); });
  return { client, observer, updates };
}

test("editing local search aborts immediately before debounce; a late old response cannot replace newer results", async t => {
  const oldResponse = deferred();
  let oldSignal;
  t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    const query = new URL(url, "http://localhost").searchParams.get("search");
    if (query === "seeking") {
      oldSignal = signal;
      // Deliberately ignore abort to simulate a response already in transit.
      return oldResponse.promise;
    }
    return json([{ isbn: "9780310092643", title: "New results" }]);
  });
  const oldOptions = localBookSearchQueryOptions("seeking");
  const { client, observer, updates } = observe(t, oldOptions);
  await until(() => oldSignal);

  const duringDebounce = activeBookSearchQuery("seeking allah", "seeking");
  assert.equal(duringDebounce, "");
  observer.setOptions(localBookSearchQueryOptions(duringDebounce));
  assert.equal(oldSignal.aborted, true);
  assert.equal(observer.getCurrentResult().fetchStatus, "idle");

  observer.setOptions(localBookSearchQueryOptions(activeBookSearchQuery("seeking allah", "seeking allah")));
  await until(() => observer.getCurrentResult().data?.[0]?.title === "New results");
  oldResponse.resolve(json([{ isbn: "old", title: "Old results" }]));
  await tick();
  assert.equal(observer.getCurrentResult().data[0].title, "New results");
  assert.equal(client.getQueryData(oldOptions.queryKey), undefined);
  assert.ok(updates.every(update => !update.isError));
});

test("editing internet search aborts the edition batch; late metadata cannot overwrite newer results", async t => {
  const oldResponse = deferred();
  let oldSignal;
  t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    const request = new URL(url);
    if (request.hostname === "www.googleapis.com") return json({}, 429);
    if (request.pathname === "/search.json") {
      const old = request.searchParams.get("q") === "seeking";
      return json({ docs: [{ title: "A Book", author_name: ["Author"], isbn: [old ? "9780060652920" : "9780310092643"] }] });
    }
    if (request.searchParams.get("bibkeys").includes("9780060652920")) {
      oldSignal = signal;
      return oldResponse.promise;
    }
    return json({ "ISBN:9780310092643": { details: { title: "New edition", physical_format: "Paperback", publish_date: "2018" } } });
  });
  const oldOptions = globalBookSearchQueryOptions("seeking");
  const { client, observer, updates } = observe(t, oldOptions);
  await until(() => oldSignal);
  observer.setOptions(globalBookSearchQueryOptions(activeBookSearchQuery("seeking allah", "seeking")));
  assert.equal(oldSignal.aborted, true);
  assert.equal(observer.getCurrentResult().fetchStatus, "idle");

  observer.setOptions(globalBookSearchQueryOptions("seeking allah"));
  await until(() => observer.getCurrentResult().data?.[0]?.title === "New edition");
  oldResponse.resolve(json({ "ISBN:9780060652920": { details: { title: "Old edition" } } }));
  await tick();
  assert.equal(observer.getCurrentResult().data[0].isbn, "9780310092643");
  assert.equal(client.getQueryData(oldOptions.queryKey), undefined);
  assert.ok(updates.every(update => !update.isError));
});

test("clearing an ISBN lookup aborts it and prevents late book data or provider fallback", async t => {
  const oldResponse = deferred();
  let oldSignal;
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    assert.ok(url.startsWith("/api/"), "cancelled lookup must not continue to internet providers");
    if (url.includes("9780060652920")) {
      oldSignal = signal;
      return oldResponse.promise;
    }
    return json([{ isbn: "9780310092643", title: "New book", stock: 2 }]);
  });
  const oldOptions = bookLookupQueryOptions("9780060652920");
  const { client, observer } = observe(t, oldOptions);
  await until(() => oldSignal);
  observer.setOptions(bookLookupQueryOptions(""));
  assert.equal(oldSignal.aborted, true);
  assert.equal(observer.getCurrentResult().data, undefined);

  observer.setOptions(bookLookupQueryOptions("9780310092643"));
  await until(() => observer.getCurrentResult().data?.title === "New book");
  oldResponse.resolve(json([]));
  await tick();
  assert.equal(fetchMock.mock.callCount(), 2);
  assert.equal(observer.getCurrentResult().data.isbn, "9780310092643");
  assert.equal(client.getQueryData(oldOptions.queryKey), undefined);
});

for (const stage of ["local", "google", "open_library"]) {
  test(`ISBN cancellation during ${stage} fetch propagates without continuing fallback`, async t => {
    const response = deferred();
    const controller = new AbortController();
    const calls = [];
    t.mock.method(globalThis, "fetch", async (url, { signal }) => {
      const provider = url.startsWith("/api/") ? "local" : url.includes("googleapis.com") ? "google" : "open_library";
      calls.push(provider);
      assert.equal(signal, controller.signal);
      if (provider === stage) return response.promise;
      return provider === "local" ? json([]) : json({}, 429);
    });
    const pending = lookupBookByISBN("9780310092643", controller.signal);
    const rejection = assert.rejects(pending, { name: "AbortError" });
    await until(() => calls.includes(stage));
    controller.abort();
    response.resolve(json([]));
    await rejection;
    assert.equal(calls.at(-1), stage);
  });
}
