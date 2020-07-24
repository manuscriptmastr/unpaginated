# unpaginated

Dead simple pagination. `unpaginated()` executes a paginated function until done, gathering results as efficiently as possible.

```js
import fetch from 'node-fetch';
import unpaginated from 'unpaginated';

// Say our API has 100 posts available
const url = 'http://api.example';

const fetchPosts = page =>
  fetch(`${url}/posts?_page=${page}&_limit=20`)
    .then(res => res.json())
    .then(({ posts }) => posts);

unpaginated(fetchPosts);
```

Many APIs include a total property in the payload. Just return `{ data: [], total: number }` and `unpaginated` will run concurrently:
```js
import fetch from 'node-fetch';
import unpaginated from 'unpaginated';

const url = 'http://api.example';

const fetchPostsWithTotal = page =>
  fetch(`${url}/posts?_page=${page}&_limit=20`)
    .then(res => res.json())
    .then(({ posts, total }) => ({ data: posts, total }));

unpaginated(fetchPostsWithTotal);
```

For APIs that don't talk pages, use `byOffset`:
```js
import fetch from 'node-fetch';
import { byOffset } from 'unpaginated';

const url = 'http://api.example';

const fetchPosts = offset =>
  fetch(`${url}/posts?_offset=${offset}&_limit=20`)
    .then(res => res.json())
    .then(({ posts }) => posts);

byOffset(fetchPosts);
```

`unpaginated` also understands cursor-based pagination. Just return `{ data: [], cursor: string | number }`:
```js
import fetch from 'node-fetch';
import { byCursor } from 'unpaginated';

const url = 'http://api.example';

// cursor is undefined the first call, so we'll set a default
const fetchPostsWithCursor = (cursor = '') =>
  fetch(`${url}/posts?_cursor=${cursor}&_limit=20`)
    .then(res => res.json())
    .then(({ posts, cursor }) => ({ data: posts, cursor }));

byCursor(fetchPostsWithCursor);
```

## API

### `unpaginated`

Alias for `byPage`.
```js
import unpaginated from 'unpaginated';
```

### `byPage`

`(Page -> Promise ([a] | { data: [a], total: Int })) -> Promise [a]`
- `Page` is an integer beginning at 1

### `byOffset`

`(Offset -> Promise ([a] | { data: [a], total: Int })) -> Promise [a]`
- `Offset` is an integer beginning at 0

### `byCursor`

`(Cursor -> Promise { data: [a], cursor: Cursor | Any }) -> Promise [a]`
- `Cursor` is a string with length or a number. `byCursor` finishes pagination when `Cursor` no longer satisfies this requirement.
