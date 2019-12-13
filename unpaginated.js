const { unnest, range, isFunction } = require('lodash/fp');

// Helpers for functions to resolve page 1, 2, 3... to their own needs
const page = (pageNum, zeroIndex = false) =>
  zeroIndex ? pageNum - 1 : pageNum;

const offset = (pageNum, limit, zeroIndex = true) =>
  (pageNum - 1) * limit + (zeroIndex ? 0 : 1);

const totalPages = (total, limit) =>
  (total - (total % limit)) / limit + (total % limit > 0 ? 1 : 0);

const unpaginated = (func, limit = 100, total) =>
  total === undefined
    ? unpaginatedWithoutCount(func, limit)
    : unpaginatedWithCount(func, limit, total);

const unpaginatedWithCount = (func, limit, total) => async () => {
  total = isFunction(total) ? await total() : total;
  const pages = range(1, totalPages(total, limit) + 1);
  const allThings = await Promise.all(pages.map((page) =>
    func(page, limit)
  ));
  return unnest(allThings);
};

const unpaginatedWithoutCount = (func, limit) => async () => {
  let entries = [];
  let done = false;
  let page = 1;

  while (!done) {
    const newEntries = await func(page, limit);
    entries = entries.concat(newEntries);
    done = newEntries.length < limit ? true : false;
    page++;
  };

  return entries;
};

module.exports = { unpaginated, page, offset, totalPages };