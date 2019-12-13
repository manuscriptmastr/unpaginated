# unpaginated

No one likes paginated results. `unpaginated()`, given:
1. A function that accepts a page/offset and limit,
2. A limit (optional, default 100)
3. A number or function (sync/async) that retrieves the total count (optional),
returns an unpaginated function.

```js
const { unpaginated } = require('unpaginated');
const fetch = require('node-fetch');

const url = 'https://jsonplaceholder.typicode.com';

const fetchPosts = (page = 1, limit = 100) =>
  fetch(`${url}/posts?_page=${page}&_limit=${limit}`)
    .then(res => res.json());

const getPostsCount = async () => {...}; // imagine we can ask the API for a total count

unpaginated(fetchPosts)();
// makes 1 request to retrieve all 100 posts

unpaginated(fetchPosts, 20)();
// makes 6 requests, one at a time. 5 returned 20 results, 6th returned 0

unpaginated(fetchPosts, 20, 100)();
// makes 5 requests concurrently because total is supplied

unpaginated(fetchPost, 20, getPostsCount)();
// makes 6 requests: 1 to retrieve total, then 5 concurrently to retrieve posts.
// While this requires an extra call, it is drastically faster.
```

The following utilities are included to help `unpaginated()` speak the language of your API:
  - `page(pageNum, zeroIndex = false)`
  - `offset(pageNum, limit, zeroIndex = true)`

```js
const { unpaginated, offset } = require('unpaginated');
const fetch = require('node-fetch');

const url = 'https://www.third-party/api';

const fetchUsers = (offset = 0, limit = 100) =>
  fetch(`${url}/users?offset=${offset}&limit=${limit}`)
    .then(res => res.json());

unpaginated(
  (page, limit) => fetchUsers(offset(page, limit), limit),
  200
)();
```