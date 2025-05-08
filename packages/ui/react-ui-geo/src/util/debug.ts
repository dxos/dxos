//
// Copyright 2024 DXOS.org
//

const debug = false;

export const timer = <T = void>(cb: () => T): T => {
  const start = Date.now();
  const data = cb();
  const t = Date.now() - start / 1_000;
  if (debug) {
    // eslint-disable-next-line no-console
    console.log({ t, data });
  }

  return data;
};
