//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import * as MemoryQuery from '@dxos/echo-memory/MemoryQuery';
import * as RdfStore from '@dxos/echo-memory/RdfStore';
import { SpaceId } from '@dxos/keys';

import { serviceError } from './service-rpc.ts';

export const QueryRequest = Schema.Struct({
  spaceId: SpaceId,
  sparql: Schema.String,
  local: Schema.optional(Schema.Boolean),
});
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

export const QueryResponse = Schema.Struct({ rows: Schema.Array(MemoryQuery.SparqlRow) });

export const WriteRequest = Schema.Struct({
  spaceId: SpaceId,
  writes: Schema.Array(RdfStore.Write),
  local: Schema.optional(Schema.Boolean),
});
export interface WriteRequest extends Schema.Schema.Type<typeof WriteRequest> {}

/** The id of the batch the call wrote. */
export const BatchResponse = Schema.Struct({ id: Schema.String });

export const ExportRequest = Schema.Struct({ spaceId: SpaceId, format: RdfStore.Format });
export const ExportResponse = Schema.Struct({ data: Schema.Uint8Array });

export const ImportRequest = Schema.Struct({ spaceId: SpaceId, data: Schema.Uint8Array, format: RdfStore.Format });

export const ChangesRequest = Schema.Struct({ spaceId: SpaceId });

/**
 * Effect RPC definitions for a space's RDF store (`@dxos/echo-memory`'s `RdfStore` port), served by the client
 * services host over the database it already holds: the host only runs SPARQL and applies batches, and a memory runs
 * beside the caller. Each call names the space whose store it reads or writes.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('query', { payload: QueryRequest, success: QueryResponse, error: serviceError }),
  Rpc.make('write', { payload: WriteRequest, success: BatchResponse, error: serviceError }),
  Rpc.make('export', { payload: ExportRequest, success: ExportResponse, error: serviceError }),
  Rpc.make('import', { payload: ImportRequest, success: BatchResponse, error: serviceError }),
  /** Each batch of the shared part once applied, from when the call starts. */
  Rpc.make('changes', { payload: ChangesRequest, success: RdfStore.Batch, error: serviceError, stream: true }),
).prefix('RdfStoreService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `RdfStoreService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/RdfStoreService') {}
