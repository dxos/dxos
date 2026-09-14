//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { createKvsStore } from '@dxos/effect';
import * as Observability from '@dxos/observability/Observability';

import { meta } from '#meta';
import { ObservabilityCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ namespace }: { namespace: string }) {
    const stateAtom = createKvsStore({
      key: meta.profile.key,
      schema: ObservabilityCapabilities.StateSchema,
      defaultValue: () => ({}),
    });

    // NOTE: Group is set at runtime, not persisted.
    const group = yield* Effect.tryPromise(() => Observability.getObservabilityGroup(namespace));
    const registry = yield* Capabilities.AtomRegistry;
    registry.set(stateAtom, { ...registry.get(stateAtom), group });

    return Capability.contribute(ObservabilityCapabilities.State, stateAtom);
  }),
);
