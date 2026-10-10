//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';
import * as SqlError from 'effect/sql/SqlError';

/** Lowercase hex SHA-256 digest of the blob's bytes. */
const Key = Schema.String;

export const PutRequest = Schema.Struct({
  key: Key,
  data: Schema.Uint8Array,
  contentType: Schema.optional(Schema.String),
  /** The hosted store already holds these bytes (a read-through fill), so they need no upload. */
  uploaded: Schema.Boolean,
});
export interface PutRequest extends Schema.Schema.Type<typeof PutRequest> {}

export const KeyRequest = Schema.Struct({ key: Key });
export interface KeyRequest extends Schema.Schema.Type<typeof KeyRequest> {}

export const GetResponse = Schema.Struct({
  /** Absent when the key is not stored on this device. */
  blob: Schema.optional(Schema.Struct({ data: Schema.Uint8Array, contentType: Schema.optional(Schema.String) })),
});
export interface GetResponse extends Schema.Schema.Type<typeof GetResponse> {}

export const HasResponse = Schema.Struct({ exists: Schema.Boolean });
export interface HasResponse extends Schema.Schema.Type<typeof HasResponse> {}

export const ListPendingRequest = Schema.Struct({ limit: Schema.Number });
export interface ListPendingRequest extends Schema.Schema.Type<typeof ListPendingRequest> {}

export const ListPendingResponse = Schema.Struct({ keys: Schema.Array(Key) });
export interface ListPendingResponse extends Schema.Schema.Type<typeof ListPendingResponse> {}

/**
 * Effect RPC definitions for the device-local, content-addressed blob store held in the client
 * services' database, with its ledger of blobs not yet uploaded to the hosted store.
 * Mirrors `LocalBlobStore` in `@dxos/blob`, which the client adapts it to.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('put', { payload: PutRequest, error: SqlError.SqlError }),
  Rpc.make('get', { payload: KeyRequest, success: GetResponse, error: SqlError.SqlError }),
  Rpc.make('has', { payload: KeyRequest, success: HasResponse, error: SqlError.SqlError }),
  Rpc.make('listPending', { payload: ListPendingRequest, success: ListPendingResponse, error: SqlError.SqlError }),
  Rpc.make('markUploaded', { payload: KeyRequest, error: SqlError.SqlError }),
).prefix('BlobStoreService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `BlobStoreService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/BlobStoreService') {}
