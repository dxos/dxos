//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capabilities } from '../common/index.ts';
import { Capability, Plugin } from '../core/index.ts';
import { meta } from './meta.ts';

// Lazy on purpose: this plugin is in the app's static boot closure, so an eager body would put
// the process manager's runtime (and the AI client behind it) in the boot graph.
const ProcessManagerCapability = Capability.makeLazyModule(
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
      Capabilities.OperationHandlers,
    ],
  },
  () => import('./process-manager-capability.ts'),
);

const HistoryCapabilities = Capability.makeLazyModule(
  'HistoryCapabilities',
  {
    requires: [Capabilities.UndoMapping, Capabilities.OperationInvoker],
    provides: [Capabilities.UndoRegistry, Capabilities.HistoryTracker],
  },
  () => import('./history/capability.ts'),
);

export const ProcessManagerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ProcessManagerCapability),
  Plugin.addModule(HistoryCapabilities),
  Plugin.make,
);
