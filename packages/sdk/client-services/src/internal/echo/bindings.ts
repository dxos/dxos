//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';
import {
  EchoEdgeSubductionReplicatorLayer,
  EchoHostService,
  EdgeAutomergeReplicatorService,
  MeshEchoReplicatorLayer,
  MeshEchoReplicatorService,
} from '@dxos/echo-host';
import { EdgeConnectionService, EdgeHttpClientService } from '@dxos/edge-client';
import { Hook } from '@dxos/effect';

import { registerReplicator } from './echo-host.ts';

//
// Replicators the echo host takes from `@dxos/echo-host`. Each provides its own tag as well as
// registering itself with the host, because the data space manager reads both tags with
// `Effect.serviceOption` to decide which replication paths a space gets. The ones that need the edge
// are pruned without it.
//

export const MeshReplicatorSpec = LayerSpec.make(
  { affinity: 'application', requires: [], provides: [MeshEchoReplicatorService] },
  () => MeshEchoReplicatorLayer(),
);

export const MeshReplicatorRegistrationSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [MeshEchoReplicatorService, EchoHostService, Hook.Controller],
    provides: [],
    eager: true,
  },
  () => registerReplicator(MeshEchoReplicatorService),
);

export const EdgeSubductionReplicatorSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeConnectionService, EdgeHttpClientService],
    provides: [EdgeAutomergeReplicatorService],
  },
  () => EchoEdgeSubductionReplicatorLayer(),
);

export const EdgeSubductionReplicatorRegistrationSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeAutomergeReplicatorService, EchoHostService, Hook.Controller],
    provides: [],
    eager: true,
  },
  () => registerReplicator(EdgeAutomergeReplicatorService),
);
