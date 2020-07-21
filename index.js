import both from 'ramda/src/both.js';
import curry from 'ramda/src/curry.js';
import has from 'ramda/src/has.js';
import partialRight from 'ramda/src/partialRight.js';

const chainRec = curry(async (fn, acc) => {
  const next = value => ({ tag: next, value });
  const done = value => ({ tag: done, value });
  const { value, tag } = await fn(next, done, acc);
  return tag === next ? chainRec(fn, value) : value;
});

const _serial = curry((fn, acc) => chainRec(
  (next, done, { data, page, limit = 0 }) => fn(page).then(d =>
    d.length === 0 || d.length < limit
      ? done(data.concat(d))
      : next({ data: data.concat(d), page: page + 1, limit: d.length })
  ),
  acc
));

const _concurrent = curry((fn, acc) => chainRec(
  (next, done, { data, page, limit, total }) =>
    total === undefined
      ? fn(page).then(({ data: d, total: t }) =>
          d.length > 0 && d.length < t
            ? next({ data: [Promise.resolve(data.concat(d))], page: page + 1, limit: d.length, total: t })
            : done(data.concat(d))
        )
      : page * limit < total
        ? next({ data: [...data, fn(page).then(res => res.data)], page: page + 1, limit, total })
        : done(Promise.all([...data, fn(page).then(res => res.data)]).then(arr => arr.flat()))
  ,
  acc
));

const isValidCursor = cursor => ((typeof cursor === 'string' && cursor.length > 0) || typeof cursor === 'number');

const _cursor = curry((fn, acc) => chainRec(
  (next, done, { data, cursor }) => fn(cursor).then(({ data: d, cursor: c }) =>
    d.length > 0 && isValidCursor(c)
      ? next({ data: data.concat(d), cursor: c })
      : done(data.concat(d))
  ),
  acc
));

export const serial = partialRight(_serial, [{ data: [], page: 1 }]);
export const concurrent = partialRight(_concurrent, [{ data: [], page: 1 }]);
export const cursor = partialRight(_cursor, [{ data: [] }]);

const raise = err => { throw err };
const p = fn => async (...args) => fn(...args);

/**
* Executes a paginated function over all pages, preferring concurrency where possible.
* @async
* @template T
* @param {(page: number) => Promise<T[] | { data: T[], cursor: (string | number) } | { data: T[], total: number }>} fn
* @returns {Promise<T[]>} An array of all entries
* @example
* const fetchUsers = (page = 1) => fetch(`/users?page=${page}&limit=100`).then(res => res.json());
* await unpaginated(fetchUsers);
*   // => Array of all users
*/
export default fn => p(fn)().then(d =>
  Array.isArray(d) ?
    d.length ? _serial(p(fn), { data: d, page: 2 }) : d
: both(has('data'), has('total'))(d) ?
    d.data.length ? _concurrent(p(fn), { ...d, page: 2, limit: d.data.length }) : d.data
: both(has('data'), has('cursor'))(d) ?
    d.data.length && isValidCursor(d.cursor) ? _cursor(p(fn), d) : d.data
:
    raise(new TypeError('Function must return an array or an object with an array'))
);
