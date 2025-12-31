//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';

const OperationInvoker = Capability.lazy('OperationInvoker', () => import('./invoker/capability'));
const HistoryCapabilities = Capability.lazy('HistoryCapabilities', () => import('./history/capability'));

export const OperationPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.DispatcherReady],
    activate: OperationInvoker,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.DispatcherReady],
    activate: HistoryCapabilities,
  }),
  Plugin.make,
);
