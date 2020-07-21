# unpaginated

Dead simple pagination. `unpaginated()` executes a paginated function until done, gathering results as efficiently as possible.

```js
import unpaginated  from 'unpaginated';
import fetch from 'node-fetch';

// Say our API has 100 posts available
const url = 'http://api.example';

// Simplest case: return an array of results
const fetchPosts = (page = 1) =>
  fetch(`${url}/posts?_page=${page}&_limit=20`)
    .then(res => res.json())
    .then(payload => payload.data);

// makes 6 requests, serially. Sixth request was empty
unpaginated(fetchPosts);

// Better case: return an object with a cursor property
const fetchPostsWithCursor = (cursor = '') =>
  fetch(`${url}/posts?_cursor=${cursor}&_limit=20`)
    .then(res => res.json())
    .then(({ data, cursor }) => ({ data, cursor }));

// makes 5 requests, serially.
unpaginated(fetchPostsWithCursor);

// Best case: return an object with a total property
const fetchPostsWithTotal = (page = 1) =>
  fetch(`${url}/posts?_page=${page}&_limit=20`)
    .then(res => res.json())
    .then(({ data, total }) => ({ data, total }));

// makes 1 request serially, then 4 concurrently
unpaginated(fetchPostsWithTotal);
```
