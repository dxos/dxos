import type * as Rpc from './Rpc.ts';
import * as ServicePb from '@dxos/protocols/buf/dxos/echo/service_pb';
import * as QueryPb from '@dxos/protocols/buf/dxos/echo/query_pb';
import * as ClientQueuePb from '@dxos/protocols/buf/dxos/client/queue_pb';
import * as MeshBridgePb from '@dxos/protocols/buf/dxos/mesh/bridge_pb';

export interface BridgeService extends Rpc.BufRpcHandlers<typeof MeshBridgePb.BridgeService> {}
