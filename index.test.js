import test from 'ava';
import curry from 'ramda/src/curry.js';
import pipe from 'ramda/src/pipe.js';
import range from 'ramda/src/range.js';
import tap from 'ramda/src/tap.js';
import unpaginated, { byCursor, byOffset, byPage } from './index.js';

const offset = curry((limit, page) => (page - 1) * limit + 0);

const POSTS = range(1, 101).map(num => ({ id: num }));

const FETCH_POSTS = async (limit, page) =>
  POSTS.slice(offset(limit, page), offset(limit, page + 1));

const FETCH_POSTS_WITH_TOTAL = async (limit, page) => ({
  data: POSTS.slice(offset(limit, page), offset(limit, page + 1)),
  total: POSTS.length
});

const FETCH_POSTS_WITH_CURSOR = async (limit, cursor = 0) => ({
  data: POSTS.slice(cursor, cursor + limit),
  cursor: cursor + limit >= POSTS.length ? null : cursor + limit
});

test('serial(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(() => Promise.resolve([]), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('serial(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(100, pg), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 2);
});

test('serial(fn), exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 6);
});

test('serial(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('concurrent(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 0 }), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('concurrent(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 100 }), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('concurrent(fn), exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('concurrent(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await byPage(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('cursor(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], cursor: 5 }), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('cursor(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: ['hello', 'world'], cursor: null }), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), ['hello', 'world']);
  t.deepEqual(times, 1);
});

test('cursor(fn), exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(cur => FETCH_POSTS_WITH_CURSOR(20, cur), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('cursor(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(cur => FETCH_POSTS_WITH_CURSOR(21, cur), tap(() => { times += 1 }));
  t.deepEqual(await byCursor(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn) raises original error thrown by fn', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => { throw new Error('BOOM') }, tap(() => { times += 1 }));
  await t.throwsAsync(
    () => unpaginated(fetchPosts),
    { instanceOf: Error, message: 'BOOM' }
  );
  t.deepEqual(times, 1);
});

test('unpaginated(fn) throws TypeError when fn returns an unsupported value', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => 123, tap(() => { times += 1 }));
  await t.throwsAsync(
    () => unpaginated(fetchPosts),
    { instanceOf: TypeError, message: 'Function must return an array or an object with data and total' }
  );
  t.deepEqual(times, 1);
});
