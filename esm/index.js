import andThen from 'ramda/src/andThen.js';
import both from 'ramda/src/both.js';
import curry from 'ramda/src/curry.js';
import either from 'ramda/src/either.js';
import flip from 'ramda/src/flip.js';
import unnest from 'ramda/src/unnest.js';
import has from 'ramda/src/has.js';
import is from 'ramda/src/is.js';
import pipe from 'ramda/src/pipe.js';
import pipeWith from 'ramda/src/pipeWith.js';
import prop from 'ramda/src/prop.js';
import when from 'ramda/src/when.js';
import unary from 'ramda/src/unary.js';
import unless from 'ramda/src/unless.js';

const chainRec = curry(async (fn, acc) => {
  const next = value => ({ tag: next, value });
  const done = value => ({ tag: done, value });
  const { value, tag } = await fn(next, done, acc);
  return tag === next ? chainRec(fn, value) : value;
});

const withTotal = when(Array.isArray, data => ({ data, total: undefined }));

const validateWith = curry((pred, message) => unless(pred, () => raise(new TypeError(message))));
const raise = err => { throw err };
const promisify = fn => async (...args) => fn(...args);

const isDataTotalObject = both(has('data'), has('total'));
const isCursorObject = both(has('data'), has('cursor'));
const isActionableCursor = either(both(is(String), s => !!s.length), is(Number));
const isValidPageValue = either(Array.isArray, isDataTotalObject);

const _page = fn => chainRec(
  (next, done, { data, page, limit, total }) =>
    total === undefined
      ? fn(page, limit).then(({ data: d, total: t }) =>
          d.length === 0 || d.length < limit
            ? done(Promise.all([...data, Promise.resolve(d)]).then(unnest))
            : next({ data: [...data, Promise.resolve(d)], page: page + 1, limit: d.length, total: t })
        )
      : page * limit < total
        ? next({ data: [...data, fn(page, limit).then(prop('data'))], page: page + 1, limit, total })
        : done(Promise.all([...data, fn(page, limit).then(prop('data'))]).then(unnest))
  ,
  { data: [], page: 1, total: undefined, limit: 0 }
);

const pageMiddleware = fn => pipeWith(andThen, [
  promisify(fn),
  validateWith(isValidPageValue, 'Function must return an array of data or an object with data and total'),
  withTotal
]);

export const byPage = pipe(unary, pageMiddleware, _page);

export const offset = curry((limit, page) => (page - 1) * limit + 0);
export const byOffset = pipe(fn => pipe(flip(offset), fn), pageMiddleware, _page);

const _cursor = fn => chainRec(
  (next, done, { data, cursor }) => fn(cursor).then(({ data: d, cursor: c }) =>
    d.length > 0 && isActionableCursor(c)
      ? next({ data: data.concat(d), cursor: c })
      : done(data.concat(d))
  ),
  { data: [], cursor: undefined }
);

const cursorMiddleware = fn => pipeWith(andThen, [
  promisify(fn),
  validateWith(isCursorObject, 'Function must return an object with data and cursor')
]);

export const byCursor = pipe(cursorMiddleware, _cursor);

export default byPage;
