import test from 'ava';
import curry from 'ramda/src/curry.js';
import pipe from 'ramda/src/pipe.js';
import range from 'ramda/src/range.js';
import tap from 'ramda/src/tap.js';
import { byPage, byOffset, byCursor, offset } from './index.js';

const POSTS = range(1, 101).map(num => ({ id: num }));

const FETCH_POSTS = curry(async (limit, page) =>
  POSTS.slice(offset(limit, page), offset(limit, page + 1))
);

const FETCH_POSTS_WITH_TOTAL = curry(async (limit, page) => ({
  data: POSTS.slice(offset(limit, page), offset(limit, page + 1)),
  total: POSTS.length
}));

const FETCH_POSTS_OFFSET = curry(async (limit, offset) =>
  POSTS.slice(offset, offset + limit)
);

const FETCH_POSTS_OFFSET_WITH_TOTAL = curry(async (limit, offset) => ({
  data: POSTS.slice(offset, offset + limit),
  total: POSTS.length
}));

const FETCH_POSTS_WITH_CURSOR = curry(async (limit, cursor = 0) => ({
  data: POSTS.slice(cursor, cursor + limit),
  cursor: cursor + limit >= POSTS.length ? null : cursor + limit
}));

test('byPage(fn), serial, empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(() => Promise.resolve([]), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('byPage(fn), serial, single case', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS(100), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 2);
});

test('byPage(fn), serial, exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS(20), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 6);
});

test('byPage(fn), serial, leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS(21), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byPage(fn), concurrent, empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 0 }), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('byPage(fn), concurrent, single case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 100 }), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('byPage(fn), concurrent, exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_WITH_TOTAL(20), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byPage(fn), concurrent, leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_WITH_TOTAL(21), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byPage(fn) raises error when fn returns incorrect value', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({}), tap(() => { times += 1 }));
  await t.throwsAsync(
    () => byPage(fetchPosts),
    { instanceOf: TypeError, message: 'Function must return an array of data or an object with data and total' }
  );
  t.deepEqual(times, 1);
});

test('byPage(fn) raises original error thrown by fn', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => { throw new Error('BOOM') }, tap(() => { times += 1 }));
  await t.throwsAsync(
    () => byPage(fetchPosts),
    { instanceOf: Error, message: 'BOOM' }
  );
  t.deepEqual(times, 1);
});

test('byOffset(fn) accepts fn that requires an offset and returns data', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_OFFSET(21), tap(() => { times += 1 }));
  t.deepEqual(await byOffset(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byOffset(fn) accepts fn that requires an offset and returns { data, total }', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_OFFSET_WITH_TOTAL(21), tap(() => { times += 1 }));
  t.deepEqual(await byOffset(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byOffset(fn) raises error when fn returns incorrect value', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({}), tap(() => { times += 1 }));
  await t.throwsAsync(
    () => byOffset(fetchPosts),
    { instanceOf: TypeError, message: 'Function must return an array of data or an object with data and total' }
  );
  t.deepEqual(times, 1);
});

test('byOffset(fn) raises original error thrown by fn', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => { throw new Error('BOOM') }, tap(() => { times += 1 }));
  await t.throwsAsync(
    () => byOffset(fetchPosts),
    { instanceOf: Error, message: 'BOOM' }
  );
  t.deepEqual(times, 1);
});

test('byCursor(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], cursor: 5 }), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('byCursor(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: ['hello', 'world'], cursor: null }), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), ['hello', 'world']);
  t.deepEqual(times, 1);
});

test('byCursor(fn), exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(cur => FETCH_POSTS_WITH_CURSOR(20, cur), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byCursor(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(cur => FETCH_POSTS_WITH_CURSOR(21, cur), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('byCursor(fn) raises error when fn returns incorrect value', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({}), tap(() => { times += 1 }));
  await t.throwsAsync(
    () => byCursor(fetchPosts),
    { instanceOf: TypeError, message: 'Function must return an object with data and cursor' }
  );
  t.deepEqual(times, 1);
});

test('byCursor(fn) raises original error thrown by fn', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => { throw new Error('BOOM') }, tap(() => { times += 1 }));
  await t.throwsAsync(
    () => byCursor(fetchPosts),
    { instanceOf: Error, message: 'BOOM' }
  );
  t.deepEqual(times, 1);
});
