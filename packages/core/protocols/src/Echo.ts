//
// Copyright 2026 DXOS.org
//

import type * as ClientQueuePb from '@dxos/protocols/buf/dxos/client/queue_pb';
import type * as QueryPb from '@dxos/protocols/buf/dxos/echo/query_pb';
import type * as ServicePb from '@dxos/protocols/buf/dxos/echo/service_pb';

import type * as Rpc from './Rpc.ts';

export interface DataService extends Rpc.BufRpcHandlers<typeof ServicePb.DataService> {}

export interface QueryService extends Rpc.BufRpcHandlers<typeof QueryPb.QueryService> {}

export interface QueueService extends Rpc.BufRpcHandlers<typeof ClientQueuePb.QueueService> {}
