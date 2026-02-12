//
// Copyright 2026 DXOS.org
//

import type * as MeshBridgePb from '@dxos/protocols/buf/dxos/mesh/bridge_pb';

import type * as Rpc from './Rpc.ts';

export interface BridgeService extends Rpc.BufRpcHandlers<typeof MeshBridgePb.BridgeService> {}
