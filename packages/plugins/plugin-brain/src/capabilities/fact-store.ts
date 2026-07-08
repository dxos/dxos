//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { FactStore } from '@dxos/pipeline-rdf';

import { BrainCapabilities, makeFactStoreRegistry } from '#types';

/**
 * Contributes a single shared {@link FactStoreRegistry} plus a space-affinity {@link LayerSpec} that
 * provides `FactStore` to operations. Both close over the SAME registry, so the operation-injected
 * store and the capability-read store resolve to the same per-space instance.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = makeFactStoreRegistry();

    const factStoreSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [],
        provides: [FactStore],
      },
      (context) => {
        invariant(context.space, 'space context required for FactStore layer');
        return registry.layerFor(context.space);
      },
    );

    return [
      Capability.contributes(BrainCapabilities.FactStoreRegistry, registry),
      Capability.contributes(Capabilities.LayerSpec, factStoreSpec),
    ];
  }),
);
