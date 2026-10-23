import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import Book from '../models/Book.js';
import booksRouter from '../routes/books.js';

let server;
let url;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/books', booksRouter);
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  url = `http://127.0.0.1:${server.address().port}/books/fixture/adjust-stock`;
});

after(() => new Promise(resolve => server.close(resolve)));

function adjust(body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('invalid stock counts are rejected before accessing the database', async t => {
  const find = t.mock.method(Book, 'findOne', () => assert.fail('Unexpected database access'));
  for (const stock of [undefined, null, '3', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const response = await adjust({ stock, comment: 'Corrected after physical count' });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /whole number/);
  }
  assert.equal(find.mock.callCount(), 0);
});

test('comments require ten normalized characters and three actual words', async t => {
  const find = t.mock.method(Book, 'findOne', () => assert.fail('Unexpected database access'));
  for (const comment of [undefined, null, 123, '', '   ', 'a b c', 'Inventory correction', 'a       b       c', '........ .... ....']) {
    const response = await adjust({ stock: 0, comment });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /10 characters and 3 words/);
  }
  assert.equal(find.mock.callCount(), 0);
});

test('the exact count and normalized reason are saved atomically with history', async t => {
  t.mock.method(Book, 'findOne', async () => ({ id: 'fixture', stock: 8 }));
  const update = t.mock.method(Book, 'findOneAndUpdate', (filter, changes) => ({
    select: async () => ({ id: 'fixture', stock: changes.$set.stock, stockAdjustments: [changes.$push.stockAdjustments] })
  }));

  const response = await adjust({ stock: 0, comment: '  Corrected   after\nphysical count  ' });
  assert.equal(response.status, 200);
  const book = await response.json();
  assert.equal(book.stock, 0);
  assert.equal(book.stockAdjustments[0].previousStock, 8);
  assert.equal(book.stockAdjustments[0].newStock, 0);
  assert.equal(book.stockAdjustments[0].comment, 'Corrected after physical count');
  assert.ok(Number.isFinite(Date.parse(book.stockAdjustments[0].adjustedAt)));
  const [filter, changes, options] = update.mock.calls[0].arguments;
  assert.deepEqual(filter, { id: 'fixture', stock: 8 });
  assert.deepEqual(Object.keys(changes).sort(), ['$push', '$set']);
  assert.deepEqual(options, { new: true, runValidators: true });
});

test('missing books return 404 without attempting a write', async t => {
  t.mock.method(Book, 'findOne', async () => null);
  const update = t.mock.method(Book, 'findOneAndUpdate', () => assert.fail('Unexpected write'));
  assert.equal((await adjust({ stock: 2, comment: 'Corrected after physical count' })).status, 404);
  assert.equal(update.mock.callCount(), 0);
});

test('the exact minimum comment length and a positive replacement count are accepted', async t => {
  t.mock.method(Book, 'findOne', async () => ({ id: 'fixture', stock: 8 }));
  t.mock.method(Book, 'findOneAndUpdate', (filter, changes) => ({
    select: async () => ({ id: 'fixture', stock: changes.$set.stock })
  }));
  const response = await adjust({ stock: 3, comment: 'One two go' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).stock, 3);
});

test('a concurrent stock change returns a conflict without reporting success', async t => {
  t.mock.method(Book, 'findOne', async () => ({ id: 'fixture', stock: 8 }));
  t.mock.method(Book, 'findOneAndUpdate', () => ({ select: async () => null }));
  const response = await adjust({ stock: 2, comment: 'Corrected after physical count' });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Stock changed/);
});

test('database failures produce an error response', async t => {
  t.mock.method(Book, 'findOne', async () => { throw new Error('Unable to save adjustment'); });
  const response = await adjust({ stock: 2, comment: 'Corrected after physical count' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Unable to save adjustment');
});

test('the book schema retains multiple adjustment records and validates each reason', async () => {
  const book = new Book({
    isbn: '9780000000001', title: 'Fixture Book', authors: ['Fixture Author'], price: 10,
    stockAdjustments: [
      { previousStock: 8, newStock: 0, comment: 'Corrected after physical count' },
      { previousStock: 0, newStock: 2, comment: 'Found two missing copies' }
    ]
  });
  await book.validate();
  assert.equal(book.stockAdjustments.length, 2);
  assert.ok(book.stockAdjustments.every(entry => entry.adjustedAt instanceof Date));
  book.stockAdjustments[1].comment = 'Only two';
  await assert.rejects(book.validate(), /comment/);
});
