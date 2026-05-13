//
// Copyright 2025 DXOS.org
//

import { ActivationEvents } from '../common';
import { Capability, Plugin } from '../core';
import { meta } from './meta';

const HistoryCapabilities = Capability.lazy('HistoryCapabilities', () => import('./history/capability'));

export const OperationPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: HistoryCapabilities,
  }),
  Plugin.make,
);
