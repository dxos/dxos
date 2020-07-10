//
// Copyright 2020 DXOS.org
//

import through from 'through2';

/**
 * Returns a matcher function that tests if the given message matches the filter.
 * @param {Object} filter
 * @return {function({Object}): boolean}
 */
export const createMatcher = filter => message => {
  // TODO(burdon): Predicate based filters (e.g., Op.Any(['a', 'b'], 'default')).
  return !Object.keys(filter).some(key => {
    const value = filter[key];
    if (value === undefined) {
      return false;
    }

    // Mismatch is attribute exists but doesn't match regexp.
    if (value instanceof RegExp) {
      return !message[key] || !message[key].match(value);
    }

    // Mistmatch if not attributes match any filter.
    if (Array.isArray(value)) {
      return !value.some(value => message[key] === value);
    }

    // Mismatch if doesn't equal.
    return message[key] !== value;
  });
};

/**
 * Returns a filtered message stream.
 * @param {Object} filter
 * @param {Object} options
 * @return {ReadableStream}
 */
export const createFilteredStream = (filter = {}, { feedStoreInfo = false } = {}) => {
  let matcher = createMatcher(filter);

  if (feedStoreInfo) {
    const originalMatcher = matcher;
    matcher = ({ data }) => originalMatcher(data);
  }

  return through.obj((message, encoding, next) => {
    if (matcher(message)) {
      return next(null, message);
    }

    next();
  });
};
