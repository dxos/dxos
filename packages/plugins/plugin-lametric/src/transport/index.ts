//
// Copyright 2026 DXOS.org
//

import { type FetchLike } from './LaMetricTransport.ts';

export * from './LaMetricTransport.ts';

/**
 * Tauri's HTTP client issues the request from Rust, which is why it reaches a LAN device at all: the
 * web view is bound by mixed-content and CORS rules that neither LaMetric endpoint satisfies.
 */
export const tauriFetch: FetchLike = async (url, init) => {
  const { fetch } = await import('@tauri-apps/plugin-http');
  return fetch(url, init);
};
