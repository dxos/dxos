//
// Copyright 2023 DXOS.org
//

/**
 * Debounce callback.
 */
export const debounce = <T>(cb: (arg: T) => void, wait = 100) => {
  let t: ReturnType<typeof setTimeout>;
  return (arg: T) => {
    clearTimeout(t);
    t = setTimeout(() => cb(arg), wait);
  };
};
