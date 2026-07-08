import { RpcGroup, Rpc, type RpcClient } from '@effect/rpc';
import * as Schema from 'effect/Schema';

import * as IndexingPb from './proto/gen/dxos/echo/indexing';
import * as QueryPb from './proto/gen/dxos/echo/query';

export class Rpcs extends RpcGroup.make(
  Rpc.make('setConfig', {
    payload: Schema.declare<IndexingPb.IndexConfig>((_): _ is IndexingPb.IndexConfig => true),
  }),
  Rpc.make('execQuery', {
    payload: Schema.declare<QueryPb.QueryRequest>((_): _ is QueryPb.QueryRequest => true),
    success: Schema.declare<QueryPb.QueryResponse>((_): _ is QueryPb.QueryResponse => true),
    stream: true,
  }),
  Rpc.make('reindex', {}),
).prefix('QueryService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
