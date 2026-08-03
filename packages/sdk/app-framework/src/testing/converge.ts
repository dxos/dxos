//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { ActivationEvents } from '../common';
import { ActivationEvent, type PluginManager } from '../core';

/**
 * Activates the module set the app converges to: the {@link ActivationEvents.Idle} wave, then
 * every core+enabled plugin's start event. Sequential so the work trickles instead of saturating
 * the main thread; per-plugin failures are logged and skipped so one broken feature cannot stall
 * the rest.
 *
 * Testing only, which is why it lives here rather than in the public `ActivationEvents` module.
 * A running app never needs it: the host fires the idle wave once, and each plugin's start fires
 * on demand when one of its surfaces renders. This substitutes for that demand where nothing can
 * supply it — a headless harness mounts no surfaces at all, and a story renders exactly one in
 * isolation, so both would otherwise sit at whatever the startup pass activated and assert
 * against modules that never load.
 */
export const activateConvergedModules = (
  manager: Pick<PluginManager.PluginManager, 'getCore' | 'getEnabled' | 'activate'>,
): Effect.Effect<void> =>
  Effect.forEach(
    [
      ActivationEvents.Idle,
      ...new Set([...manager.getCore(), ...manager.getEnabled()].map(ActivationEvent.pluginStart)),
    ],
    (event) =>
      manager
        .activate(event)
        .pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => log.warn('activation event failed', { event: event.id, error: String(error) })),
          ),
        ),
    { discard: true },
  );
