//
// Copyright 2022 DXOS.org
//

import { type LogOptions } from '../../config';

// NOTE: Implementation for the browser. See `package.json`.
export const loadOptions = (filepath?: string): LogOptions | undefined => {
  try {
    let dxlog: string | undefined;
    // if running in a worker, use the localStorage.dxlog setting forwarded on worker initilization in
    // @dxos/client/src/worker/onconnect.ts
    if (typeof localStorage === 'undefined') {
      if ((globalThis as any).localStorage_dxlog) {
        dxlog = (globalThis as any).localStorage_dxlog;
      }
    } else {
      dxlog = localStorage.getItem('dxlog') ?? undefined;
    }
    if (!dxlog) {
      return undefined;
    }
    return JSON.parse(dxlog);
  } catch (err) {
    console.info("can't parse dxlog config", err);
    return undefined;
  }
};
