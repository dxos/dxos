//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { LayoutState, type LayoutStateProps } from '../types';

export const updateState = (fn: (state: LayoutStateProps) => Partial<LayoutStateProps>) =>
  Effect.gen(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(LayoutState);
    const current = registry.get(stateAtom);
    registry.set(stateAtom, { ...current, ...fn(current) });
  });
