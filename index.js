import andThen from 'ramda/src/andThen.js';
import both from 'ramda/src/both.js';
import has from 'ramda/src/has.js';
import is from 'ramda/src/is.js';
import pipeWith from 'ramda/src/pipeWith.js';
import prop from 'ramda/src/prop.js';
import range from 'ramda/src/range.js';
import unnest from 'ramda/src/unnest.js';

export const offset = (pageNum, limit, zeroIndex = true) =>
  (pageNum - 1) * limit + (zeroIndex ? 0 : 1);

export const page = (pageNum, zeroIndex = false) =>
  zeroIndex ? pageNum - 1 : pageNum;

export const totalPages = (total, limit) => Math.ceil(total / limit);

const unpaginatedConcurrent = (fn, limit, total, startPage = 1) => {
  const pages = range(startPage, totalPages(total, limit) + 1);
  return Promise.all(pages.map(page => fn(page, limit))).then(unnest);
};

export const unpaginatedSerial = async (fn, limit, startPage = 1) => {
  let entries = [];
  let done = false;
  let page = startPage;

  while (!done) {
    const newEntries = await fn(page, limit);
    entries = entries.concat(newEntries);
    done = newEntries.length < limit;
    page += 1;
  };

  return entries;
};

/**
 * Executes a paginated function over all pages, preferring concurrency where possible.
 * @async
 * @template T
 * @param {(page: number, limit: number) => Promise<T[] | { data: T[], total: number }>} fn
 * @param {number} limit
 * @param {(number | (() => number) | (() => Promise<number>))} [total]
 * @returns {Promise<T[]>} An array of all entries
 * @example
 * const fetchUsers = (page, limit) => fetch(`/users?page=${page}&limit=${limit}`).then(res => res.json());
 * await unpaginated(fetchUsers, 20, 100);
 *   // => Array of all 100 users
 */
const unpaginated = async (fn, limit = 100, total) => {
  if (total !== undefined) {
    const _total = is(Function, total) ?
        await total()
    : is(Number, total) ?
        total
    : raise(new TypeError('total argument must be a number or a sync/async function that returns a number'));
    return unpaginatedConcurrent(fn, limit, _total, 1);
  }

  const firstEntries = await fn(1, limit);
  const isDataObject = both(has('data'), has('total'));

  if (isDataObject(firstEntries)) {
    const { data, total } = firstEntries;
    if (data.length >= total) {
      return data;
    } else {
      const funcDataOnly = pipeWith(andThen, [fn, prop('data')]);
      const leftOverEntries = await unpaginatedConcurrent(funcDataOnly, limit, total, 2);
      return [...data, ...leftOverEntries];
    }
  } else {
    if (firstEntries.length < limit) {
      return firstEntries;
    } else {
      const leftOverEntries = await unpaginatedSerial(fn, limit, 2);
      return [...firstEntries, ...leftOverEntries];
    }
  }
};

export default unpaginated;
