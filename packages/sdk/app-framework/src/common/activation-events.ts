//
// Copyright 2025 DXOS.org
//

import { ActivationEvent as ActivationEvent$ } from '../core';

/**
 * Fired when the app is started.
 */
export const Startup = ActivationEvent$.make('org.dxos.app-framework.event.startup');

//
// Dependent Events
//

/**
 * Fired to load any newly available surfaces.
 */
export const SetupReactSurface = ActivationEvent$.make('org.dxos.app-framework.event.setup-react-surface');

/**
 * Fired before the process manager is created.
 * Plugins should contribute their {@link Capabilities.LayerSpec} entries and
 * {@link Capabilities.OperationHandler} sets before this event fires so the
 * process manager's {@link ServiceResolver} and {@link OperationInvoker} pick
 * them up at construction time.
 */
export const SetupProcessManager = ActivationEvent$.make('org.dxos.app-framework.event.setup-process-manager');

//
// Triggered Events
//

/**
 * Fired after the process manager runtime is ready and its derived capabilities
 * (`ProcessManagerRuntime`, `ServiceResolver`, `ProcessMonitor`, `OperationInvoker`)
 * have been contributed.
 */
export const ProcessManagerReady = ActivationEvent$.make('org.dxos.app-framework.event.process-manager-ready');
