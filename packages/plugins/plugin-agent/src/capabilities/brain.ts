//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AgentService from '@dxos/compute/AgentService';
import * as LayerSpec from '@dxos/compute/LayerSpec';

import { BrainService } from '#types';

import * as BrainMemory from '../brain/BrainMemory.ts';
import { triggerRegistry } from '../triggers.ts';

//
// Capability Module
//
// The in-memory brain for agents whose turns run in this app; EDGE-hosted turns use EDGE's brain. Its
// triggers live in the app's registry, which the agent's state panel lists.
//

const BrainLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [AgentService.AgentService],
    provides: [BrainService.BrainService],
  },
  () =>
    Layer.effect(
      BrainService.BrainService,
      AgentService.AgentService.pipe(
        Effect.map((agents) => BrainMemory.make(agents, { triggers: triggerRegistry }).service),
      ),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, BrainLayerSpec)),
);
