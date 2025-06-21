//
// Copyright 2025 DXOS.org
//

export const throttle = (cb: (...args: any[]) => void, wait = 100): ((...args: any[]) => void) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= wait) {
      cb(...args);
      lastCall = now;
    }
  };
};
