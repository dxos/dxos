//
// Copyright 2025 DXOS.org
//

import { ActivationEvents } from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';

const OperationInvoker = Capability.lazy('OperationInvoker', () => import('./invoker-capability'));
const HistoryCapabilities = Capability.lazy('HistoryCapabilities', () => import('./history/capability'));

export const OperationPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.ManagedRuntimeReady,
    activatesBefore: [ActivationEvents.SetupOperationResolver],
    activatesAfter: [ActivationEvents.OperationInvokerReady],
    activate: OperationInvoker,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: HistoryCapabilities,
  }),
  Plugin.make,
);
