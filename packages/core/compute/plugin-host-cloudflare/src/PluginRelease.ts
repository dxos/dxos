//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** The runtime a plugin bundle is loaded with; matches what compute-service loads Worker Loader functions with. */
export const COMPATIBILITY_DATE = '2026-03-17';

/**
 * `no_handle_cross_request_promise_resolution` matches every EDGE worker: past the 2024-10-14 default a promise settled
 * from another request's context has its continuation dropped.
 */
export const COMPATIBILITY_FLAGS: readonly string[] = [
  'nodejs_compat',
  'nodejs_als',
  'no_handle_cross_request_promise_resolution',
];
