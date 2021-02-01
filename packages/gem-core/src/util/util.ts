//
// Copyright 2020 DXOS.org
//

export const noop = () => {};

/**
 * @param {any|function} value
 */
// TODO(burdon): Remove this (too strange).
export const value = (value: any | Function): Function => {
  if (value === undefined) {
    return (value: any) => value;
  }

  if (typeof value === 'function') {
    return (defaults: any) => {
      return value(defaults);
    };
  }

  return () => value;
};
