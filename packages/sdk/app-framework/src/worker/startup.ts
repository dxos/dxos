//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '../core/activation-event.ts';

// A module of its own, so `Capability.workerModule` reaches this event without the page's boot graph
// evaluating the rest of `WorkerEvents`.

/**
 * Fired once when the worker starts, before the layer stack is built: worker plugin modules
 * activate on it, so every `Capabilities.LayerSpec` they contribute is in place when the base
 * collects them.
 */
export const Startup = ActivationEvent.make('org.dxos.app-framework.event.workerStartup');
