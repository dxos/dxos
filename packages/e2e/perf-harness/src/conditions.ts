//
// Copyright 2026 DXOS.org
//

import { type Comparability } from './types.ts';

/** Set by `pnpm perf --http2`; the flow then reaches the server over `https`. */
export const PERF_HTTP2 = Boolean(process.env.DX_PERF_HTTP2);

/** The conditions `pnpm perf` hands a flow through its environment, as the fields every row records. */
export const flowConditions = (): Pick<Comparability, 'http2' | 'serviceWorker' | 'cpuThrottle'> => {
  const cpuThrottle = Number.parseFloat(process.env.DX_PERF_CPU_THROTTLE ?? '');
  return {
    ...(PERF_HTTP2 ? { http2: true } : {}),
    ...(process.env.DX_PERF_SERVICE_WORKER ? { serviceWorker: true } : {}),
    ...(cpuThrottle > 1 ? { cpuThrottle } : {}),
  };
};
