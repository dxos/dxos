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
 * Fired at host idle after startup completes; the off-critical-path gate for modules
 * deferred via the manager's `deferStartup` predicate.
 * Defined in core; see {@link ActivationEvent$.DeferredStartup}.
 */
export const DeferredStartup = ActivationEvent$.DeferredStartup;

/**
 * Demand signal for skill definitions: the assistant is in use (or a routine toolkit is
 * materializing), so parked skill modules should load. One unkeyed event — skills register into
 * a shared registry and are discovered dynamically, so per-plugin gating buys nothing.
 */
export const SkillsRequested = ActivationEvent$.make('org.dxos.app-framework.event.skillsRequested');

/**
 * Demand signal for React surfaces, keyed by role NSID. Fired when a `Surface` for the role
 * first renders (and by availability checks that miss), so surface modules gated on their bound
 * roles load exactly when a screen region that can host them appears.
 */
export const SurfacesRequested = (role: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.surfacesRequested', role);
