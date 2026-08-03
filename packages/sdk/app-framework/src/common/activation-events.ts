//
// Copyright 2025 DXOS.org
//

import { ActivationEvent as ActivationEvent$ } from '../core';

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
