import test from 'ava';
import R from 'ramda';
import unpaginated, { offset, page, totalPages } from './unpaginated.js';
const { andThen, pipe, range, tap } = R;

const POSTS = range(1, 101).map(num => ({ id: num }));

const FETCH_POSTS = async (page = 1, limit = 100) =>
  POSTS.slice(offset(page, limit), offset(page + 1, limit));

const FETCH_POSTS_TOTAL = async () => POSTS.length;

test('offset(num, limit, zeroIndex)', t => {
  t.deepEqual(offset(1, 100), 0);
  t.deepEqual(offset(2, 100), 100);
  t.deepEqual(offset(1, 100, false), 1);
  t.deepEqual(offset(2, 100, false), 101);
});

test('page(num, zeroIndex)', t => {
  t.deepEqual(page(1), 1);
  t.deepEqual(page(2), 2);
  t.deepEqual(page(1, true), 0);
  t.deepEqual(page(2, true), 1);
});

test('totalPages(total, limit)', t => {
  t.deepEqual(totalPages(12, 1), 12);
  t.deepEqual(totalPages(12, 2), 6);
  t.deepEqual(totalPages(13, 2), 7);
});

test('unpaginated(fn, limit, total) basic usage', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts, 20, 100), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn, limit, total) accepts total function arg', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts, 20, FETCH_POSTS_TOTAL), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn, limit, total) makes one more call to get leftover entries', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts, 19, 100), POSTS);
  t.deepEqual(times, 6);
});

test('unpaginated(fn, limit) calls functions one at a time when total is not passed', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts, 20), POSTS);
  t.deepEqual(times, 6);
});

test('unpaginated(fn, limit) calls first function and chooses concurrency for leftover entries when object with total is returned', async t => {
  let times = 0;
  const fetchPostsWithTotal = pipe(FETCH_POSTS, andThen(posts => ({ data: posts, total: 100 })), tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPostsWithTotal, 20), POSTS);
  t.deepEqual(times, 5);
});

test('unpaginated(fn) defaults limit to 100', async t => {
  let times = 0;
  const fetchPosts = pipe(FETCH_POSTS, tap(() => { times += 1 }));
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
  t.deepEqual(times, 2);
});
