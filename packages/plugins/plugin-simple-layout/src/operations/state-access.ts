// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../types';

export const layoutStateAccess = Effect.gen(function* () {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(SimpleLayoutStateCapability);

  return {
    getState: () => registry.get(stateAtom),
    updateState: (fn: (current: SimpleLayoutState) => SimpleLayoutState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
  };
});
