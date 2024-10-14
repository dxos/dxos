//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

export const wrapWithCatch = (fn: (...args: any[]) => any) => {
  return (...args: any[]) => {
    try {
      return fn(...args);
    } catch (err) {
      log.catch(err);
    }
  };
};
