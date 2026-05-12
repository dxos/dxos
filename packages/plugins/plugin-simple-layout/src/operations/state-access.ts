// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { SimpleLayoutCapabilities } from '../types';

export const layoutStateAccess = Effect.gen(function* () {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(SimpleLayoutCapabilities.State);

  return {
    getState: () => registry.get(stateAtom),
    updateState: (
      fn: (current: SimpleLayoutCapabilities.SimpleLayoutState) => SimpleLayoutCapabilities.SimpleLayoutState,
    ) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
  };
});
