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
 * Demand signal for operation handlers, keyed by the plugin expected to provide them. Fired by
 * the handler-set resolver when an invoked operation has no registered handler; an activation
 * policy parks handler modules on their own plugin's key so exactly the needed plugin's handlers
 * load. The plugin key is derived from the operation key's `<plugin>.operation.<name>` shape —
 * handlers for operations defined outside their plugin are reached by the resolver's fallback.
 */
export const OperationHandlersRequested = (pluginKey: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.operationHandlersRequested', pluginKey);

/**
 * Demand signal for skill definitions: the assistant is in use (or a routine toolkit is
 * materializing), so parked skill modules should load. One unkeyed event — skills register into
 * a shared registry and are discovered dynamically, so per-plugin gating buys nothing.
 */
export const SkillsRequested = ActivationEvent$.make('org.dxos.app-framework.event.skillsRequested');
