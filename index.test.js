import test from 'ava';
import pipe from 'ramda/src/pipe.js';
import range from 'ramda/src/range.js';
import tap from 'ramda/src/tap.js';
import unpaginated from './index.js';

/*
TODO:
1. Align test cases for all strategies
  - Empty case
  - Odd number case
  - Incorrect input case
2. Update README
3. Make mocks more realistic
4. Consider alternative interfaces. Does this feel natural for:
  - fn that returns array?
  - fn that returns { data, total }?
  - fn that returns { data, cursor }?
  - fn that requires an offset?
  - APIs where a separate call must be made for total?
*/

const POSTS = range(1, 101).map(num => ({ id: num }));

const offset = (pageNum, limit, zeroIndex = true) =>
  (pageNum - 1) * limit + (zeroIndex ? 0 : 1);

const FETCH_POSTS = async (limit, page = 1) =>
  POSTS.slice(offset(page, limit), offset(page + 1, limit));

const POSTS_OBJECT = {
  0: { data: POSTS.slice(0, 20), cursor: 1 },
  1: { data: POSTS.slice(20, 40), cursor: 2 },
  2: { data: POSTS.slice(40, 60), cursor: 3 },
  3: { data: POSTS.slice(60, 80), cursor: 4 },
  4: { data: POSTS.slice(80, 100), cursor: null }
};

const FETCH_POSTS_WITH_CURSOR = async (cursor = 0) => POSTS_OBJECT[cursor];

const FETCH_POSTS_WITH_TOTAL = async (limit, page = 1) => ({
  data: POSTS.slice(offset(page, limit), offset(page + 1, limit)),
  total: POSTS.length
});

test('unpaginated(fn) runs fn once when fn returns an empty array', async t => {
  let times = 0;
  const fetchPosts = pipe(() => Promise.resolve([]), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn) runs fn until empty array is returned', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 6);
});

test('unpaginated(fn) runs fn until array is less than limit', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn) accepts fn that returns { data: empty, cursor }', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], cursor: 5 }), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn) accepts fn that returns { data, cursor }', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_WITH_CURSOR, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn) accepts fn that returns { data: empty, total }', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 0 }), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn) accepts fn that returns { data, total }', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn) works when total % limit is not zero', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
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
    { instanceOf: TypeError, message: 'Function must return an array or an object with an array' }
  );
  t.deepEqual(times, 1);
});
