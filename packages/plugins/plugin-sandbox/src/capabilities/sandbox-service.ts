//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientService } from '@dxos/client';
import * as LayerSpec from '@dxos/compute/LayerSpec';

import { RepositoryService, SandboxService } from '#types';

import { layerFromCapabilities, layerRepository } from '../services/layer.ts';

/** One backend for the application: local sandboxes share proxies and per-sandbox command locks. */
const SandboxLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService, Capability.Service],
    provides: [SandboxService.Service],
  },
  () => layerFromCapabilities,
);

const RepositoryLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService],
    provides: [RepositoryService.Service],
  },
  () => layerRepository,
);

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(Capabilities.LayerSpec, SandboxLayerSpec),
    Capability.contribute(Capabilities.LayerSpec, RepositoryLayerSpec),
  ]),
);
