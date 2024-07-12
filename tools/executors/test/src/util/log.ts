//
// Copyright 2024 DXOS.org
//

export const log = (message: string) => {
  const logFn = (globalThis as any)?.dx_log?.debug;
  if (typeof logFn === 'function') {
    logFn(message);
  } else {
    console.log(message);
  }
};
