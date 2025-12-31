//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';

const OperationInvoker = Capability.lazy('OperationInvoker', () => import('./operation-invoker'));
const UndoRegistry = Capability.lazy('UndoRegistry', () => import('./undo-registry'));
const HistoryTracker = Capability.lazy('HistoryTracker', () => import('./history-tracker'));

export const OperationPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.DispatcherReady],
    activate: OperationInvoker,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.DispatcherReady],
    activate: UndoRegistry,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.DispatcherReady],
    activate: HistoryTracker,
  }),
  Plugin.make,
);

