# unpaginated

Dead simple pagination. `unpaginated()` executes a paginated function until done, gathering results as efficiently as possible.

```js
import unpaginated  from 'unpaginated';
import fetch from 'node-fetch';

// Say our API has 100 posts available
const url = 'http://api.example';

const fetchPosts = (page = 1) =>
  fetch(`${url}/posts?_page=${page}&_limit=20`)
    .then(res => res.json())
    .then(({ posts }) => posts);

// makes 6 requests, serially. Sixth request was empty
unpaginated(fetchPosts);
```

`unpaginated` also understands cursor-based pagination. Just return `{ data: [], cursor: string | number }`:
```js
import unpaginated  from 'unpaginated';
import fetch from 'node-fetch';

const url = 'http://api.example';

// Better case: return an object with a cursor property
const fetchPostsWithCursor = (cursor = '') =>
  fetch(`${url}/posts?_cursor=${cursor}&_limit=20`)
    .then(res => res.json())
    .then(({ posts, cursor }) => ({ data: posts, cursor }));

// makes 5 requests, serially.
unpaginated(fetchPostsWithCursor);
```

Many APIs include a total property in the payload. Just return `{ data: [], total: number }` and `unpaginated` will run concurrently:
```js
import unpaginated  from 'unpaginated';
import fetch from 'node-fetch';

const url = 'http://api.example';

const fetchPostsWithTotal = (page = 1) =>
  fetch(`${url}/posts?_page=${page}&_limit=20`)
    .then(res => res.json())
    .then(({ posts, total }) => ({ data: posts, total }));

// makes 1 request serially, then 4 concurrently
unpaginated(fetchPostsWithTotal);
```
