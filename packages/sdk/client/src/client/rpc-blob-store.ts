//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';

import { type LocalBlobStore } from '@dxos/blob';
import { type ClientServicesRpc } from '@dxos/client-protocol';
import { runServiceCall } from '@dxos/protocols';

/**
 * {@link LocalBlobStore} served by the client services host, whose database holds the bytes — in the
 * browser, the OPFS SQLite database owned by the worker.
 */
export const createRpcBlobStore = (rpc: ClientServicesRpc, runtime: EffectContext.Context<never>): LocalBlobStore => ({
  put: (key, data, { contentType, uploaded }) =>
    runServiceCall(runtime, rpc['BlobStoreService.put']({ key, data, contentType, uploaded })),

  get: async (key) => (await runServiceCall(runtime, rpc['BlobStoreService.get']({ key }))).blob,

  has: async (key) => (await runServiceCall(runtime, rpc['BlobStoreService.has']({ key }))).exists,

  listPending: async ({ limit }) => [
    ...(await runServiceCall(runtime, rpc['BlobStoreService.listPending']({ limit }))).keys,
  ],

  markUploaded: (key) => runServiceCall(runtime, rpc['BlobStoreService.markUploaded']({ key })),
});
