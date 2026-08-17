//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

// Definitions only — bodies load lazily so the plugin definition stays out of the boot
// evaluation floor (this def chunk was 177 kB when the bodies were inline).
export const ProgressRegistry = Capability.lazyModule(
  'ProgressRegistry',
  // Startup, not demand: every consumer reads the registry optionally (`useProgressMonitor`,
  // the trace sinks' lazy getters), so no dependency edge ever pulls this module — left to the
  // opportunistic idle wave it frequently never activates and progress silently has nowhere to go.
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.ProgressRegistry],
    activatesOn: ActivationEvents.Startup,
  },
  () => import('./progress-registry'),
);
export const TraceProgressSink = Capability.lazyModule(
  'TraceProgressSink',
  { provides: [Capabilities.TraceSink] },
  () => import('./trace-progress-sink'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
