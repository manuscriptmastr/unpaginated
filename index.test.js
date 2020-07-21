import test from 'ava';
import pipe from 'ramda/src/pipe.js';
import range from 'ramda/src/range.js';
import tap from 'ramda/src/tap.js';
import unpaginated, { concurrent, cursor, serial } from './index.js';

/*
TODO:
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

test('concurrent(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 0 }), tap(() => { times += 1 }));
  t.deepEqual(await concurrent(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('concurrent(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 100 }), tap(() => { times += 1 }));
  t.deepEqual(await concurrent(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('concurrent(fn), exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await concurrent(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('concurrent(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await concurrent(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn), empty case, concurrent', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 0 }), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn), single case, concurrent', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], total: 100 }), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn), exact case, concurrent', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn), leftover case, concurrent', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS_WITH_TOTAL(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('cursor(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], cursor: 5 }), tap(() => { times += 1 }));
  t.deepEqual(await cursor(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('cursor(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: ['hello', 'world'], cursor: null }), tap(() => { times += 1 }));
  t.deepEqual(await cursor(fetchPosts), ['hello', 'world']);
  t.deepEqual(times, 1);
});

test('cursor(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_WITH_CURSOR, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn), empty case, cursor', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: [], cursor: 5 }), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn), single case, cursor', async t => {
  let times = 0;
  const fetchPosts = pipe(async () => ({ data: ['hello', 'world'], cursor: null }), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), ['hello', 'world']);
  t.deepEqual(times, 1);
});

test('unpaginated(fn), leftover case, cursor', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS_WITH_CURSOR, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('serial(fn), empty case', async t => {
  let times = 0;
  const fetchPosts = pipe(() => Promise.resolve([]), tap(() => { times += 1 }));
  t.deepEqual(await serial(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('serial(fn), single case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(100, pg), tap(() => { times += 1 }));
  t.deepEqual(await serial(fetchPosts), POSTS);
  t.deepEqual(times, 2);
});

test('serial(fn), exact case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await serial(fetchPosts), POSTS);
  t.deepEqual(times, 6);
});

test('serial(fn), leftover case', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(21, pg), tap(() => { times += 1 }));
  t.deepEqual(await serial(fetchPosts), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn), single case, serial', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(100, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 2);
});

test('unpaginated(fn), empty case, serial', async t => {
  let times = 0;
  const fetchPosts = pipe(() => Promise.resolve([]), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), []);
  t.deepEqual(times, 1);
});

test('unpaginated(fn), exact case, serial', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(20, pg), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 6);
});

test('unpaginated(fn), leftover case, serial', async t => {
  let times = 0;
  const fetchPosts = pipe(pg => FETCH_POSTS(21, pg), tap(() => { times += 1 }));
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
