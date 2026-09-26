//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientService } from '@dxos/client';
import * as LayerSpec from '@dxos/compute/LayerSpec';

import { SandboxService } from '#types';

import { layer } from '../services/layer.ts';

/** One backend for the application: local sandboxes share proxies and per-sandbox command locks. */
const SandboxLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService],
    provides: [SandboxService.Service],
  },
  () => layer,
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, SandboxLayerSpec)),
);
