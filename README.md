# unpaginated

No one likes paginated results. `unpaginated()` executes a paginated function until done.

```js
import unpaginated  from 'unpaginated';
import fetch from 'node-fetch';

const url = 'http://api.example';

const fetchPosts = (page = 1, limit = 100) =>
  fetch(`${url}/posts?_page=${page}&_limit=${limit}`)
    .then(res => res.json())
    .then(payload => payload.data);

const fetchPostsTotal = () => fetch(`${url}/posts/total`);

unpaginated(fetchPosts);
// makes 2 requests, serially. 1st returned 100 results, 2nd returned 0

unpaginated(fetchPosts, 20);
// makes 6 requests, serially. First 5 returned 20 results, 6th returned 0

unpaginated(fetchPosts, 20, fetchPostsTotal);
// makes 1 serial request to get total, then makes 5 concurrent requests

unpaginated(fetchPosts, 20, 100);
// makes 5 requests, concurrently.

// You can also return a payload object with data and total properties set.
const fetchPostsWithTotal = (page = 1, limit = 100) =>
  fetch(`${url}/posts?_page=${page}&_limit=${limit}`)
    .then(res => res.json())
    .then(({ data, total }) => ({ data, total }));

unpaginated(fetchPostsWithTotal, 20);
// makes 1 request serially, then 4 concurrently
```

The following utilities are included to help `unpaginated()` speak the language of your API:
  - `offset(pageNum, limit, zeroIndex = true)`
  - `page(pageNum, zeroIndex = false)`

```js
import unpaginated, { offset } from 'unpaginated';
import fetch from 'node-fetch';

const url = 'http://api.example';

const fetchUsers = (offset = 0, limit = 100) =>
  fetch(`${url}/users?offset=${offset}&limit=${limit}`)
    .then(res => res.json());

unpaginated((page, limit) => fetchUsers(offset(page, limit), limit), 200);
```

## ES Modules
As of version `2.0.4`, `unpaginated` is 100% ES Module friendly but backwards compatible. You can use `unpaginated` in a project:
- with `"type": "module"` set in your top-level `package.json`
- with a bundler like Webpack (e.g. `create-react-app`)
- with only CommonJS support:
```js
const { default: unpaginated, offset, page, totalPages } = require('unpaginated');
```