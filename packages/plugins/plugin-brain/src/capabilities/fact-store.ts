//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as MemoryService from '@dxos/echo-memory/MemoryService';
import { FactStore, FactStoreMemory } from '@dxos/pipeline-rdf';

/**
 * Provides `FactStore` to operations that still declare it, over the space's memory, so every fact they write or read
 * is the space's memory and not a store of its own.
 */
const FactStoreLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [MemoryService.MemoryService],
    provides: [FactStore],
  },
  () => FactStoreMemory.layer,
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, FactStoreLayerSpec)),
);
