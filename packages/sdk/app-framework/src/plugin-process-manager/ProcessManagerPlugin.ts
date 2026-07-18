//
// Copyright 2025 DXOS.org
//

import { Capabilities } from '../common';
import { Capability, Plugin } from '../core';
import { meta } from './meta';

const ProcessManagerCapability = Capability.lazyModule(
  'ProcessManager',
  {
    requires: [
      Capabilities.AtomRegistry,
      Capabilities.LayerSpec,
      Capabilities.TraceSink,
      Capabilities.OperationHandler,
    ],
    provides: [
      Capabilities.ProcessManagerRuntime,
      Capabilities.ServiceResolver,
      Capabilities.ProcessMonitor,
      Capabilities.OperationInvoker,
    ],
  },
  () => import('./process-manager-capability'),
);

const HistoryCapabilities = Capability.lazyModule(
  'HistoryCapabilities',
  {
    requires: [Capabilities.UndoMapping, Capabilities.OperationInvoker],
    provides: [Capabilities.UndoRegistry, Capabilities.HistoryTracker],
  },
  () => import('./history/capability'),
);

export const ProcessManagerPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(ProcessManagerCapability),
  Plugin.addLazyModule(HistoryCapabilities),
  Plugin.make,
);
