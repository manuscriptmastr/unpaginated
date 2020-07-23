import curry from 'ramda/src/curry.js';
import pipe from 'ramda/src/pipe.js';
import unary from 'ramda/src/unary.js';

const chainRec = curry(async (fn, acc) => {
  const next = value => ({ tag: next, value });
  const done = value => ({ tag: done, value });
  const { value, tag } = await fn(next, done, acc);
  return tag === next ? chainRec(fn, value) : value;
});

const raise = err => { throw err };
const p = fn => async (...args) => fn(...args);
const offset = curry((limit, page) => (page - 1) * limit + 0);

const isConcurrentObject = obj => typeof obj === 'object' && obj.hasOwnProperty('data') && obj.hasOwnProperty('total');
const isCursorObject = obj => typeof obj === 'object' && obj.hasOwnProperty('data') && obj.hasOwnProperty('cursor');
const isValidCursor = cursor => ((typeof cursor === 'string' && cursor.length > 0) || typeof cursor === 'number');

const _serial = curry((fn, acc) => chainRec(
  (next, done, { data, page, limit = 0 }) => fn(page, limit).then(d =>
    d.length === 0 || d.length < limit
      ? done(data.concat(d))
      : next({ data: data.concat(d), page: page + 1, limit: d.length })
  ),
  acc
));

const _concurrent = curry((fn, acc) => chainRec(
  (next, done, { data, page, limit = 0, total }) =>
    total === undefined
      ? fn(page, limit).then(({ data: d, total: t }) =>
          d.length > 0 && d.length < t
            ? next({ data: [Promise.resolve(data.concat(d))], page: page + 1, limit: d.length, total: t })
            : done(data.concat(d))
        )
      : page * limit < total
        ? next({ data: [...data, fn(page, limit).then(res => res.data)], page: page + 1, limit, total })
        : done(Promise.all([...data, fn(page, limit).then(res => res.data)]).then(arr => arr.flat()))
  ,
  acc
));

const _cursor = curry((fn, acc) => chainRec(
  (next, done, { data, cursor }) => fn(cursor).then(({ data: d, cursor: c }) =>
    d.length > 0 && isValidCursor(c)
      ? next({ data: data.concat(d), cursor: c })
      : done(data.concat(d))
  ),
  acc
));

/**
* Executes a paginated function that returns data and an optional total.
* @async
* @template T
* @param {(page: number) => Promise<T[] | { data: T[], total: number }>} fn
* @returns {Promise<T[]>} An array of all entries
* @example
* const fetchUsers = page => fetch(`/users?page=${page}&limit=100`).then(res => res.json());
* await unpaginated(fetchUsers);
*   // => Array of all users
*/
export const byPage = fn => p(unary(fn))(1).then(d =>
  Array.isArray(d) ?
    d.length ? _serial(p(fn), { data: d, page: 2, limit: d.length }) : d
: isConcurrentObject(d) ?
    d.data.length ? _concurrent(p(fn), { ...d, page: 2, limit: d.data.length }) : d.data
: 
    raise(new TypeError('Function must return an array or an object with data and total'))
);

/**
* Executes a paginated function that returns data and an optional total.
* @async
* @template T
* @param {(offset: number) => Promise<T[] | { data: T[], total: number }>} fn
* @returns {Promise<T[]>} An array of all entries
* @example
* const fetchUsers = page => fetch(`/users?page=${page}&limit=100`).then(res => res.json());
* await unpaginated(fetchUsers);
*   // => Array of all users
*/
export const byOffset = fn => pipe(offset, p(fn))(1, 0).then(d =>
  Array.isArray(d) ?
    d.length ? _serial(pipe(offset, p(fn)), { data: d, page: 2, limit: d.length }) : d
: isConcurrentObject(d) ?
    d.data.length ? _concurrent(pipe(offset, p(fn)), { ...d, page: 2, limit: d.data.length }) : d.data
: 
    raise(new TypeError('Function must return an array or an object with data and total'))
);

/**
* Executes a paginated function that returns data and a cursor.
* @async
* @template T
* @param {(page: number) => Promise<{ data: T[], cursor: (string | number) }> }>} fn
* @returns {Promise<T[]>} An array of all entries
* @example
* const fetchUsers = (cursor = '') => fetch(`/users?cursor=${cursor}&limit=100`)
*  .then(res => res.json())
*  .then(({ data, cursor }) => ({ data, cursor }));
* await unpaginated(fetchUsers);
*   // => Array of all users
*/
export const byCursor = fn => p(fn)().then(d =>
  isCursorObject(d)
    ? d.data.length && isValidCursor(d.cursor) ? _cursor(p(fn), d) : d.data
    : raise(new TypeError('Function must return an array or an object with data and valid cursor'))
);

export default byPage;
