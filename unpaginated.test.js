import test from 'ava';
import R from 'ramda';
const { andThen, pipeWith, range } = R;
import unpaginated, {
  page,
  offset,
  totalPages,
  dataTotal
} from './unpaginated.js';

const POSTS = range(1, 101).map(num => ({ id: num }));
const fetchPosts = async (page = 1, limit = 100) =>
  POSTS.slice(offset(page, limit), offset(page + 1, limit));
const fetchPostsCount = async () => POSTS.length;

test('page(num, zeroIndex)', t => {
  t.deepEqual(page(1), 1);
  t.deepEqual(page(2), 2);
  t.deepEqual(page(1, true), 0);
  t.deepEqual(page(2, true), 1);
});

test('offset(num, limit, zeroIndex)', t => {
  t.deepEqual(offset(1, 100), 0);
  t.deepEqual(offset(2, 100), 100);
  t.deepEqual(offset(1, 100, false), 1);
  t.deepEqual(offset(2, 100, false), 101);
});

test('totalPages(total, limit)', t => {
  t.deepEqual(totalPages(12, 1), 12);
  t.deepEqual(totalPages(12, 2), 6);
  t.deepEqual(totalPages(13, 2), 7);
});

test('dataTotal(toData, toTotal, result) returns object with data and total', async t => {
  const fetchPostsWithTotal = (...args) => fetchPosts(...args).then(dataTotal(K => K, () => 100));
  t.deepEqual(await fetchPostsWithTotal(1, 100), { data: POSTS, total: 100 });
});

test('unpaginated(fn, limit, total) basic usage', async t => {
  t.deepEqual(await unpaginated(fetchPosts, 20, 100), POSTS);
});

test('unpaginated(fn, limit, total) accepts total function', async t => {
  t.deepEqual(await unpaginated(fetchPosts, 20, fetchPostsCount), POSTS);
});

test('unpaginated(fn, limit, total) makes one more call to get leftover entries', async t => {
  t.deepEqual(await unpaginated(fetchPosts, 19, 100), POSTS);
});

test('unpaginated(fn, limit) calls functions one at a time when total is not passed', async t => {
  t.deepEqual(await unpaginated(fetchPosts, 20), POSTS);
});

test('unpaginated(fn) defaults limit to 100', async t => {
  t.deepEqual(await unpaginated(fetchPosts), POSTS);
});

test('unpaginated(fn, limit) calls first function, then rest concurrently if { data, total } value', async t => {
  const fetchPostsWithTotal = (...args) => fetchPosts(...args).then(posts => ({ data: posts, total: 100 }));
  t.deepEqual(await unpaginated(fetchPostsWithTotal, 20), POSTS);
});
