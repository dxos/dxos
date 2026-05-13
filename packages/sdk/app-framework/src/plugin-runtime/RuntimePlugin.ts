//
// Copyright 2025 DXOS.org
//

import { ActivationEvents } from '../common';
import { Capability, Plugin } from '../core';
import { meta } from './meta';

const ProcessManagerCapability = Capability.lazy('ProcessManager', () => import('./process-manager-capability'));

export const RuntimePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [ActivationEvents.SetupLayer, ActivationEvents.SetupOperationHandler],
    firesAfterActivation: [ActivationEvents.ManagedRuntimeReady, ActivationEvents.OperationInvokerReady],
    activate: ProcessManagerCapability,
  }),
  Plugin.make,
);
