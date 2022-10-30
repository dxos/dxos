//
// Copyright 2020 DXOS.org
//

/**
 * Filter third-party warnings from console log.
 */
export const filterConsole = (filters = {}) => {
  if (Object.keys(filters).length === 0) {
    return;
  }

  Object.keys(filters).forEach((key) => {
    const f = console[key];
    console[key] = (...args) => {
      const match = filters[key].find((str) => args[0].indexOf(str) !== -1);

      if (!match) {
        f.apply(this, Array.prototype.slice.call(args));
      }
    };
  });
};
