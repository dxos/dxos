//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { ActivationEvents } from '../common/index.ts';
import { ActivationEvent, type PluginManager } from '../core/index.ts';

/**
 * Fires every activation event that a running app fires in response to demand: the
 * {@link ActivationEvents.Idle} wave, {@link ActivationEvents.CommandsRequested}, then each core
 * and enabled plugin's start event.
 *
 * Testing only, which is why it lives here rather than in the public `ActivationEvents` module.
 * A plugin's start fires when one of its surfaces renders, and that signal does not exist here: a
 * headless harness mounts no surfaces, and a story mounts exactly one in isolation, so both would
 * otherwise sit at whatever the startup pass activated and assert against modules that never load.
 *
 * The idle wave is included as an ordering barrier, not because the manager omits it — the
 * scheduler fires it from a forked daemon, so a caller that asserts as soon as `start()` returns
 * could otherwise race it. Firing here is idempotent against the wave guard either way.
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
      // Demanded by a host building a command tree — a CLI binary or a terminal panel — and
      // nothing here is either.
      ActivationEvents.CommandsRequested,
      ...new Set([...manager.getCore(), ...manager.getEnabled()].map(ActivationEvent.pluginStart)),
    ],
    (event) =>
      manager
        .activate(event)
        .pipe(
          Effect.catch((error) =>
            Effect.sync(() => log.warn('activation event failed', { event: event.id, error: String(error) })),
          ),
        ),
    { discard: true },
  );
