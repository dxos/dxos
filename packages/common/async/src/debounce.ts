//
// Copyright 2023 DXOS.org
//

/**
 * Debounce callback.
 */
export const debounce = (cb: (...args: any[]) => void, wait = 100): ((...args: any[]) => void) => {
  let t: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => cb(...args), wait);
  };
};
