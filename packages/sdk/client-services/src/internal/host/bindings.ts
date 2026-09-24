//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';
import { RpcRouter } from '@dxos/rpc';

//
// The one layer the host pulls in from the wider monorepo: the router every service registers with.
//

export const RpcRouterSpec = LayerSpec.make(
  { affinity: 'application', requires: [], provides: [RpcRouter.RpcRouter] },
  () => RpcRouter.layer,
);
