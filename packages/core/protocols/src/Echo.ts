import type * as Rpc from './Rpc.ts';
import * as ServicePb from '@dxos/protocols/buf/dxos/echo/service_pb';
import * as QueryPb from '@dxos/protocols/buf/dxos/echo/query_pb';

export interface DataService extends Rpc.BufRpcHandlers<typeof ServicePb.DataService> {}

export interface QueryService extends Rpc.BufRpcHandlers<typeof QueryPb.QueryService> {}
