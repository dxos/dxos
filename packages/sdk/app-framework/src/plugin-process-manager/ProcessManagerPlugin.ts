//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capabilities } from '../common';
import { Capability, Plugin } from '../core';
import { meta } from './meta';

const ProcessManagerCapability = Capability.lazyModule(
  'ProcessManager',
  {
    // Event-mode on Startup: the body snapshots multi capabilities (LayerSpec, TraceSink,
    // OperationHandler), so it must run after the full registry is in — the Startup wave
    // fires post-registration and pulls all inactive multi providers first. A streaming
    // dependency round could otherwise run it before later plugins' specs contribute.
    activatesOn: ActivationEvents.Startup,
    requires: [
      Capabilities.AtomRegistry,
      Capabilities.LayerSpec,
      Capabilities.TraceSink,
      Capabilities.OperationHandler,
      Capabilities.RemoteTraceMonitor,
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
  Plugin.addModule(ProcessManagerCapability),
  Plugin.addModule(HistoryCapabilities),
  Plugin.make,
);
