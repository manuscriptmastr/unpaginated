# fetch-all

No one likes paginated results. `fetchAll()`, given:
1. A fetcher that accepts a page/offset and limit,
2. A limit (optional, default 100)
3. A number or function (sync/async) that retrieves the total count (optional),
retrieve all paginated entries as efficiently as possible.

```js
const { fetchAll } = require('fetch-all');
const fetch = require('node-fetch');

const url = 'https://jsonplaceholder.typicode.com';

const fetchPosts = (page = 1, limit = 100) =>
  fetch(`${url}/posts?_page=${page}&_limit=${limit}`)
    .then(res => res.json());

const getPostsCount = async () => {...}; // imagine we can ask the API for a total count

fetchAll(fetchPosts);
// makes 1 request to retrieve all 100 posts

fetchAll(fetchPosts, 20);
// makes 6 requests, one at a time. 5 returned 20 results, 6th returned 0

fetchAll(fetchPosts, 20, 100);
// makes 5 requests concurrently because total is supplied

fetchAll(fetchPost, 20, getPostsCount);
// makes 6 requests: 1 to retrieve total, then 5 concurrently to retrieve posts.
// While this requires an extra call, it is drastically faster.
```

The following utilities are included to help `fetchAll()` speak the language of your API:
  - `page(pageNum, zeroIndex = false)`
  - `offset(pageNum, limit, zeroIndex = true)`

```js
const { fetchAll, offset } = require('fetch-all');
const fetch = require('node-fetch');

const url = 'https://www.third-party/api';

const fetchUsers = (offset = 0, limit = 100) =>
  fetch(`${url}/users?offset=${offset}&limit=${limit}`)
    .then(res => res.json());

const users = await fetchAll(
  (page, limit) => fetchUsers(offset(page, limit), limit),
  200
);
```