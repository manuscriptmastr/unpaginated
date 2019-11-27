const assert = require('assert');
const eq = assert.deepStrictEqual;
const fetch = require('node-fetch');
const { range } = require('lodash/fp');
const {
  page,
  offset,
  totalPages,
  fetchAll,
} = require('./fetch-all');

const url = 'https://jsonplaceholder.typicode.com';

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

// Test that, given total and limit, totalPages returns number of pages to fetch
eq(totalPages(12, 1), 12);
eq(totalPages(12, 2), 6);
eq(totalPages(13, 2), 7);

const fetchPosts = (page = 1, limit = 100) =>
  fetch(`${url}/posts?_page=${page}&_limit=${limit}`)
    .then(res => res.json());

const fetchPostCount = () =>
  fetchPosts(`${url}/posts`)
    .then(posts => posts.length);

// Test basic functionality: fetcher, limit, total
fetchAll(fetchPosts, 20, 100)
  .then(posts => posts.map(u => u.id))
  .then(ids => eq(ids, range(1, 101)));

// Test that "total" arg can be a function
fetchAll(fetchPosts, 20, fetchPostCount)
  .then(posts => posts.map(u => u.id))
  .then(ids => eq(ids, range(1, 101)));

// Test that fetcher makes an extra call to get leftover entries
fetchAll(fetchPosts, 19, 100)
  .then(posts => posts.map(u => u.id))
  .then(ids => eq(ids, range(1, 101)));

// Test that fetcher switches to exploratory implementation
// when total arg is not passed in
fetchAll(fetchPosts, 20)
  .then(posts => posts.map(u => u.id))
  .then(ids => eq(ids, range(1, 101)));

// Test that fetcher defaults to limit 100
fetchAll(fetchPosts)
  .then(posts => posts.map(u => u.id))
  .then(ids => eq(ids, range(1, 101)));