const { unnest, range, isFunction } = require('lodash/fp');

// Given...
//   1) a fetcher that accepts a page/offset and limit,
//   2) a limit (optional, default 100)
//   3) a number OR function (sync/async) that retrieves the total count (optional),
// ... create a fetcher that can get all the things as quickly as possible

// const allUsers = await fetchAll(
//   (page, limit) => fetch(`/users?offset=${offset(page, limit)}&limit=${limit}`),
//   200,
//   getUsersCount
// );

// Helpers for fetchers to resolve page 1, 2, 3... to their own API needs
const page = (pageNum, zeroIndex = false) =>
  zeroIndex ? pageNum - 1 : pageNum;

const offset = (pageNum, limit, zeroIndex = true) =>
  (pageNum - 1) * limit + (zeroIndex ? 0 : 1);

const totalPages = (total, limit) =>
  (total - (total % limit)) / limit + (total % limit > 0 ? 1 : 0);

const fetchAll = async (fetcher, limit = 100, total) =>
  total === undefined
    ? fetchAllWithoutCount(fetcher, limit)
    : fetchAllWithCount(fetcher, limit, total);

const fetchAllWithCount = async (fetcher, limit, total) => {
  total = isFunction(total) ? await total() : total;
  const pages = range(1, totalPages(total, limit) + 1);
  const allThings = await Promise.all(pages.map((page) =>
    fetcher(page, limit)
  ));
  return unnest(allThings);
};

const fetchAllWithoutCount = async (fetcher, limit) => {
  let entries = [];
  let done = false;
  let page = 1;

  while (!done) {
    const newEntries = await fetcher(page, limit);
    entries = entries.concat(newEntries);
    done = newEntries.length < limit ? true : false;
    page++;
  };

  return entries;
};

module.exports = { fetchAll, page, offset, totalPages };