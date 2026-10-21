//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';

import { type BlobStore } from '@dxos/blob';
import { type ClientServicesRpc } from '@dxos/client-protocol';
import { runServiceCall } from '@dxos/protocols';

/**
 * {@link BlobStore} served by the client services host, whose database holds the bytes — in the
 * browser, the OPFS SQLite database owned by the worker. The host replicates to EDGE on its own.
 * `getRpc` is read per call because a reconnect to a new worker replaces the RPC proxy.
 */
export const createRpcBlobStore = (
  getRpc: () => ClientServicesRpc,
  runtime: EffectContext.Context<never>,
): BlobStore => ({
  put: (key, data, options) =>
    runServiceCall(runtime, getRpc(), 'BlobStoreService.put', { key, data, contentType: options?.contentType }),

  get: async (key) => (await runServiceCall(runtime, getRpc(), 'BlobStoreService.get', { key })).blob,

  has: async (key) => (await runServiceCall(runtime, getRpc(), 'BlobStoreService.has', { key })).exists,
});
