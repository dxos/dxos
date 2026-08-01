//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { ActivationEvent as ActivationEvent$, type PluginManager } from '../core';

/**
 * Fired when the app is started.
 * Defined in core; see {@link ActivationEvent$.Startup}.
 */
export const Startup = ActivationEvent$.Startup;

/**
 * The after-startup gate: fired by the host at idle once startup completes; modules declaring
 * `activatesOn: DeferredStartup` activate here instead of the boot critical path.
 * Defined in core; see {@link ActivationEvent$.DeferredStartup}.
 */
export const DeferredStartup = ActivationEvent$.DeferredStartup;

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
 * Fires every core+enabled plugin's start event, sequentially so post-ready work trickles
 * instead of saturating the main thread in one burst. The blanket successor to the retired
 * DeferredStartup wave: hosts call this at idle after ready (and demand sites — a URL naming
 * an unstarted feature, a settings panel — activate single plugins earlier). Per-plugin
 * failures are logged and skipped so one broken feature cannot stall the rest.
 */
export const activateAllPluginStartEvents = (
  manager: Pick<PluginManager.PluginManager, 'getCore' | 'getEnabled' | 'activate'>,
): Effect.Effect<void> =>
  Effect.forEach(
    [...new Set([...manager.getCore(), ...manager.getEnabled()])],
    (pluginKey) =>
      manager
        .activate(ActivationEvent$.pluginStart(pluginKey))
        .pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => log.warn('plugin start event failed', { pluginKey, error: String(error) })),
          ),
        ),
    { discard: true },
  );
