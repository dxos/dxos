//
// Copyright 2025 DXOS.org
//

import { ActivationEvents } from '../common';
import { Capability, Plugin } from '../core';
import { meta } from './meta';

const ProcessManagerCapability = Capability.lazy('ProcessManager', () => import('./process-manager-capability'));
const HistoryCapabilities = Capability.lazy('HistoryCapabilities', () => import('./history/capability'));

export const ProcessManagerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [ActivationEvents.SetupProcessManager],
    firesAfterActivation: [ActivationEvents.ProcessManagerReady],
    activate: ProcessManagerCapability,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: HistoryCapabilities,
  }),
  Plugin.make,
);
