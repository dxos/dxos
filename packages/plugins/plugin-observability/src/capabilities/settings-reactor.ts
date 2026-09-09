//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as Observability from '@dxos/observability/Observability';

import { ObservabilityCapabilities } from '#types';

/**
 * Puts the settings atom's `enabled` into effect on the running services. The atom is what the
 * user edits, and it is also what the app's settings sync writes when the choice changes on
 * another device, so following the atom covers both without the plugin knowing which happened.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const observability = yield* ObservabilityCapabilities.Observability;
    const namespace = yield* ObservabilityCapabilities.Namespace;
    const settingsAtom = yield* ObservabilityCapabilities.Settings;
    const registry = yield* Capabilities.AtomRegistry;

    // Tracked here rather than read off the backends: a stubbed backend reports enabled whatever
    // was asked of it, so it cannot tell a repeat from a change.
    let applied = registry.get(settingsAtom).enabled;
    const apply = Effect.fnUntraced(function* (enabled: boolean) {
      if (enabled === applied) {
        return;
      }
      if (enabled) {
        yield* observability.enable();
      } else {
        yield* observability.disable();
      }
      // The mirror the next boot reads before the atom exists.
      yield* Effect.promise(() => Observability.storeObservabilityDisabled(namespace, !enabled));
      // Recorded last, so a failure above leaves the value to be retried by the next change.
      applied = enabled;
    });

    // One at a time, in order, so a slower earlier apply cannot land after a newer value.
    let queue = Promise.resolve();
    const unsubscribe = registry.subscribe(settingsAtom, ({ enabled }) => {
      queue = queue.then(() => EffectEx.runPromise(apply(enabled))).catch((err) => log.catch(err));
    });
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

    return [];
  }),
);
