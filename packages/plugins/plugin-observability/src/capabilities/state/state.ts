//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';
import { getObservabilityGroup } from '@dxos/observability';

import { meta } from '../../meta';
import { ObservabilityCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: { namespace: string }) {
    const { namespace } = props!;
    const stateAtom = createKvsStore({
      key: meta.id,
      schema: ObservabilityCapabilities.StateSchema,
      defaultValue: () => ({}),
    });

    // NOTE: Group is set at runtime, not persisted.
    const group = yield* Effect.tryPromise(() => getObservabilityGroup(namespace));
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    registry.set(stateAtom, { ...registry.get(stateAtom), group });

    return Capability.contributes(ObservabilityCapabilities.State, stateAtom);
  }),
);
