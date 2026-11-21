//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { DiagramAppCapabilities } from '../types/index.ts';

/** Merges `fn`'s result into the layout's state. */
export const updateState = (
  fn: (state: DiagramAppCapabilities.LayoutState) => Partial<DiagramAppCapabilities.LayoutState>,
) =>
  Effect.gen(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const state = yield* Capability.get(DiagramAppCapabilities.LayoutState);
    const current = registry.get(state);
    registry.set(state, { ...current, ...fn(current) });
  });
