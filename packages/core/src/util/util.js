//
// Copyright 2020 DxOS.org
//

export const noop = () => {};

/**
 * @param {any|function} value
 */
// TODO(burdon): Remove this (too strange).
export const value = (value) => {
  if (value === undefined) {
    return value => value;
  }

  if (typeof value === 'function') {
    return defaults => {
      return value(defaults);
    };
  }

  return () => value;
};
