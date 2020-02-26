import { deepStrictEqual } from 'assert';
import R from 'ramda';
const { curryN, range } = R;
import unpaginated, {
  page,
  offset,
  totalPages
} from './unpaginated.js';
const eq = curryN(2, deepStrictEqual);

// [{ id: number }]
const POSTS = range(1, 101).map(num => ({ id: num }));

// Test that, given page 1, 2, 3..., page(num, zeroIndex) works like:
eq(page(1), 1);
eq(page(2), 2);
eq(page(1, true), 0);
eq(page(2, true), 1);

// Test that, given page 1, 2, 3..., offset(num, limit, zeroIndex) works like:
eq(offset(1, 100), 0);
eq(offset(2, 100), 100);
eq(offset(1, 100, false), 1);
eq(offset(2, 100, false), 101);

// Test that, given total and limit, totalPages returns number of pages
eq(totalPages(12, 1), 12);
eq(totalPages(12, 2), 6);
eq(totalPages(13, 2), 7);

const fetchPosts = async (page = 1, limit = 100) =>
  POSTS.slice(offset(page, limit), offset(page + 1, limit));

const fetchPostCount = async () => POSTS.length;

// Test basic functionality: function, limit, total
unpaginated(fetchPosts, 20, 100)().then(eq(POSTS));

// Test that "total" arg can be a function
unpaginated(fetchPosts, 20, fetchPostCount)().then(eq(POSTS));

// Test that function makes an extra call to get leftover entries
unpaginated(fetchPosts, 19, 100)().then(eq(POSTS));

// Test that function switches to exploratory implementation
// when total arg is not passed in
unpaginated(fetchPosts, 20)().then(eq(POSTS));

// Test that function defaults to limit 100
unpaginated(fetchPosts)().then(eq(POSTS));