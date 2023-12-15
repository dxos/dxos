//
// Copyright 2023 DXOS.org
//

/**
 * Debounce callback.
 */
export const debounce = <T = void>(cb: (arg: T) => void, wait = 100): ((arg: T) => void) => {
  let t: ReturnType<typeof setTimeout>;
  return (arg: T) => {
    clearTimeout(t);
    t = setTimeout(() => cb(arg), wait);
  };
};
