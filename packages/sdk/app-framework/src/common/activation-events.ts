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
 * Fired before the operation invoker is activated.
 */
export const SetupOperationHandler = ActivationEvent$.make('org.dxos.app-framework.event.setup-operation-handler');

/**
 * Fired before the managed runtime is created.
 * Plugins should contribute their Layer capabilities before this event.
 */
export const SetupLayer = ActivationEvent$.make('org.dxos.app-framework.event.setup-layer');

//
// Triggered Events
//

/**
 * Fired after the operation invoker is ready.
 */
export const OperationInvokerReady = ActivationEvent$.make('org.dxos.app-framework.event.operation-invoker-ready');

/**
 * Fired after the managed runtime is ready.
 */
export const ManagedRuntimeReady = ActivationEvent$.make('org.dxos.app-framework.event.managed-runtime-ready');
