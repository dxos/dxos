//
// Copyright 2026 DXOS.org
//

import { type Comparability } from './types.ts';

/** Set by `pnpm perf --http2`; the flow then reaches the server over `https`. */
export const PERF_HTTP2 = Boolean(process.env.DX_PERF_HTTP2);

/** Set by `pnpm perf --offline`; the browser then reaches nothing but loopback (`partition.ts`). */
export const PERF_OFFLINE = Boolean(process.env.DX_PERF_OFFLINE);

/** Set by `pnpm perf --edge <url>`: a non-production EDGE, the one host a partitioned browser may reach. */
export const PERF_EDGE_HOST = URL.canParse(process.env.DX_PERF_EDGE ?? '')
  ? new URL(process.env.DX_PERF_EDGE ?? '').hostname
  : undefined;

/** Whether the browser is partitioned, and which hosts it may reach besides loopback. */
export const partitionAllow = (): ReadonlyArray<string> | undefined =>
  PERF_EDGE_HOST ? [PERF_EDGE_HOST] : PERF_OFFLINE ? [] : undefined;

/** The conditions `pnpm perf` hands a flow through its environment, as the fields every row records. */
export const flowConditions = (): Pick<
  Comparability,
  'http2' | 'serviceWorker' | 'cpuThrottle' | 'offline' | 'edge'
> => {
  const cpuThrottle = Number.parseFloat(process.env.DX_PERF_CPU_THROTTLE ?? '');
  return {
    ...(PERF_HTTP2 ? { http2: true } : {}),
    ...(process.env.DX_PERF_SERVICE_WORKER ? { serviceWorker: true } : {}),
    ...(cpuThrottle > 1 ? { cpuThrottle } : {}),
    ...(PERF_OFFLINE ? { offline: true } : {}),
    ...(PERF_EDGE_HOST ? { edge: PERF_EDGE_HOST } : {}),
  };
};
