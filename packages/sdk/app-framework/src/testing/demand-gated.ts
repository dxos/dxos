//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { ActivationEvents } from '../common';
import { ActivationEvent, type PluginManager } from '../core';

/**
 * Fires every activation event that a running app fires in response to demand: the
 * {@link ActivationEvents.Idle} wave, then each core and enabled plugin's start event.
 *
 * Testing only, which is why it lives here rather than in the public `ActivationEvents` module.
 * Demand in a running app comes from the UI — `useApp` fires the idle wave once the app is ready,
 * and a plugin's start fires when one of its surfaces renders. Neither signal exists here: a
 * headless harness mounts no surfaces, and a story mounts exactly one in isolation, so both would
 * otherwise sit at whatever the startup pass activated and assert against modules that never load.
 *
 * Fires unconditionally rather than tracking real demand, because narrowing it to the surfaces a
 * story mounts would starve any story whose subject depends on a sibling plugin's start-gated
 * contributions. The cost is that storybook cannot catch demand-gating regressions; only the
 * runtime modules-at-ready budget covers those.
 *
 * Sequential so the work trickles instead of saturating the main thread; per-plugin failures are
 * logged and skipped so one broken feature cannot stall the rest.
 */
export const activateDemandGatedModules = (
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
