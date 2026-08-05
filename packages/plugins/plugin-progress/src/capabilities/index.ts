//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

// Definitions only — bodies load lazily so the plugin definition stays out of the boot
// evaluation floor (this def chunk was 177 kB when the bodies were inline).
export const ProgressRegistry = Capability.lazyModule(
  'ProgressRegistry',
  { requires: [Capabilities.AtomRegistry], provides: [AppCapabilities.ProgressRegistry] },
  () => import('./progress-registry'),
);
export const TraceProgressSink = Capability.lazyModule(
  'TraceProgressSink',
  { provides: [Capabilities.TraceSink] },
  () => import('./trace-progress-sink'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  // The status indicator reads the registry through the strict `useAtomCapability` on its first
  // render, and both modules are ungated (hence idle) — `requires` is what orders them.
  { requires: [AppCapabilities.ProgressRegistry], provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
