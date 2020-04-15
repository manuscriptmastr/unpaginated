import R from 'ramda';
const { both, curry, has, is, range, unnest } = R;

// Helpers for functions to resolve page 1, 2, 3... to their own needs
export const page = (pageNum, zeroIndex = false) =>
  zeroIndex ? pageNum - 1 : pageNum;

export const offset = (pageNum, limit, zeroIndex = true) =>
  (pageNum - 1) * limit + (zeroIndex ? 0 : 1);

export const totalPages = (total, limit) =>
  (total - (total % limit)) / limit + (total % limit > 0 ? 1 : 0);

export const dataTotal = curry(async (toData, toTotal, result) => ({ data: await toData(result), total: toTotal(result) }));
const isDataTotal = both(has('data'), has('total'));

const unpaginated = (func, limit = 100, total) =>
  total === undefined
    ? unpaginatedWithoutCount(func, limit)
    : unpaginatedWithCount(func, limit, total);

const unpaginatedWithCount = async (func, limit, total, startPage = 1) => {
  const _total = is(Function, total) ? await total() : total;
  const pages = range(startPage, totalPages(_total, limit) + 1);
  const allThings = await Promise.all(pages.map(page =>
    func(page, limit)
  ));
  return unnest(allThings);
};

const unpaginatedWithoutCount = async (func, limit) => {
  const firstEntries = await func(1, limit);

  if (isDataTotal(firstEntries)) {
    const { data, total } = firstEntries;
    if (data.length >= total) {
      return data;
    }
    const funcDataOnly = (...args) => func(...args).then(({ data }) => data);
    const leftOverEntries = await unpaginatedWithCount(funcDataOnly, limit, total, 2);
    return data.concat(leftOverEntries);
  } else {
    let entries = firstEntries;
    let done = firstEntries.length < limit;
    let page = 2;

    while (!done) {
      const newEntries = await func(page, limit);
      entries = entries.concat(newEntries);
      done = newEntries.length < limit;
      page++;
    };

    return entries;
  }
};

export default unpaginated;