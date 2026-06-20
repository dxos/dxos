//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';

import { StorybookCapabilities } from '../types';

export const updateState = (
  fn: (state: StorybookCapabilities.LayoutStateProps) => Partial<StorybookCapabilities.LayoutStateProps>,
) =>
  Effect.gen(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    // LayoutState may be absent when the plugin manager has been disposed (e.g. after a storybook test
    // completes but a background Effect fiber is still in flight). Treat this as a no-op.
    const stateAtomOption = yield* Effect.option(Capability.get(StorybookCapabilities.LayoutState));
    if (Option.isNone(stateAtomOption)) {
      return;
    }
    const stateAtom = stateAtomOption.value;
    const current = registry.get(stateAtom);
    registry.set(stateAtom, { ...current, ...fn(current) });
  });
