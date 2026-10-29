//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';

import { IllustratorCapabilities } from '#types';

/** Asks the views of `canvas` to reframe it, after an operation changed it on someone else's behalf. */
export const requestRefit = Effect.fnUntraced(function* (canvas: Obj.Unknown) {
  const [refit] = yield* Capability.getAll(IllustratorCapabilities.Refit);
  // A host with no views (EDGE) has no atom registry, and nothing to reframe.
  const [registry] = yield* Capability.getAll(Capabilities.AtomRegistry);
  if (!refit || !registry) {
    return;
  }
  const key = Obj.getURI(canvas);
  const current = registry.get(refit);
  registry.set(refit, { ...current, [key]: (current[key] ?? 0) + 1 });
});
