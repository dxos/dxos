//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { type PluginManager, ActivationEvent as ActivationEvent$ } from '../core';

/**
 * Fired when the app is started.
 * Defined in core; see {@link ActivationEvent$.Startup}.
 */
export const Startup = ActivationEvent$.Startup;

/**
 * Demand signal for React surfaces, keyed by role NSID. Fired when a `Surface` for the role
 * first renders (and by availability checks that miss), so surface modules gated on their bound
 * roles load exactly when a screen region that can host them appears.
 */
export const SurfacesRequested = (role: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.surfacesRequested', role);

/**
 * A plugin's feature-start event by key convention; see {@link ActivationEvent$.pluginStart}.
 */
export const PluginStart = (pluginKey: string): ActivationEvent$.ActivationEvent =>
  ActivationEvent$.pluginStart(pluginKey);

/**
 * Fired once by the host at main-thread idle after the app is interactive.
 *
 * For REGISTRATION contributions only — graph builders, operation handler sets, settings: the
 * app-wide indexes a user can reach from anywhere (the navtree, the operation registry, a
 * settings read) and which therefore no single surface can gate. A feature's own modules ride
 * its plugin start event, fired when its surface renders; putting a feature body here instead
 * is what turned the former `DeferredStartup` into a second startup pass.
 */
export const Idle = ActivationEvent$.make('org.dxos.app-framework.event.idle');

/**
 * Activates the module set the app CONVERGES to: the {@link Idle} wave, then every core+enabled
 * plugin's start event. Sequential so the work trickles instead of saturating the main thread.
 *
 * Not a host fire site — in the app the idle wave is fired once by the host and each plugin
 * starts on demand when its surface renders (see the module loader). This is for callers with
 * no surfaces to drive that demand: headless test harnesses, and stories, which render one
 * surface in isolation. Per-plugin failures are logged and skipped so one broken feature cannot
 * stall the rest.
 */
export const activateConvergedModules = (
  manager: Pick<PluginManager.PluginManager, 'getCore' | 'getEnabled' | 'activate'>,
): Effect.Effect<void> =>
  Effect.forEach(
    [Idle, ...new Set([...manager.getCore(), ...manager.getEnabled()].map(ActivationEvent$.pluginStart))],
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
