//
// Copyright 2025 DXOS.org
//

import { ActivationEvent as ActivationEvent$ } from '../core';

/**
 * Fired when the app is started.
 * Defined in core; see {@link ActivationEvent$.Startup}.
 */
export const Startup = ActivationEvent$.Startup;

//
// Dependent Events
//

/**
 * Fired to load any newly available surfaces.
 * @deprecated Contribute `Capabilities.ReactSurface` from a dependency-mode module instead.
 */
export const SetupReactSurface = ActivationEvent$.make('org.dxos.app-framework.event.setupReactSurface');

/**
 * Fired before the process manager is created.
 * Plugins should contribute their {@link Capabilities.LayerSpec} entries and
 * {@link Capabilities.OperationHandler} sets before this event fires so the
 * process manager's {@link ServiceResolver} and {@link OperationInvoker} pick
 * them up at construction time.
 * @deprecated Contribute `Capabilities.LayerSpec` / `Capabilities.OperationHandler` from a dependency-mode module instead.
 */
export const SetupProcessManager = ActivationEvent$.make('org.dxos.app-framework.event.setupProcessManager');

//
// Triggered Events
//

/**
 * Fired after the process manager runtime is ready and its derived capabilities
 * (`ProcessManagerRuntime`, `ServiceResolver`, `ProcessMonitor`, `OperationInvoker`)
 * have been contributed.
 * @deprecated Declare `requires` on the process-manager capabilities (e.g. `Capabilities.OperationInvoker`) instead.
 */
export const ProcessManagerReady = ActivationEvent$.make('org.dxos.app-framework.event.processManagerReady');
