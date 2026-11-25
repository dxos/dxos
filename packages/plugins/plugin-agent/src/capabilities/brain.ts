//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/compute/Agent';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as MemoryService from '@dxos/echo-memory/MemoryService';

import { BrainService } from '#types';

import * as BrainMemory from '../brain/BrainMemory.ts';
import { triggerRegistry } from '../triggers.ts';

//
// Capability Module
//
// The in-memory brain for agents whose turns run in this app; EDGE-hosted turns use EDGE's brain. Its
// triggers live in the app's registry, which the agent's state panel lists.
//

// One state for the app, so every build of the layer sees the same facts, rules and outboxes.
/** A space's brain over its memory; the triggers it holds are mirrored into the registry the UI lists. */
const BrainLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Agent.Service, MemoryService.MemoryService],
    provides: [BrainService.BrainService],
  },
  () => BrainMemory.layer({ triggers: triggerRegistry }),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, BrainLayerSpec)),
);
