//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

// Definitions only — bodies load lazily so the plugin definition stays out of the boot
// evaluation floor (this def chunk was 177 kB when the bodies were inline).
export const ProgressRegistry = Capability.lazyModule(
  'ProgressRegistry',
  // Startup: every consumer reads the registry optionally, so no dependency edge ever pulls this module.
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.ProgressRegistry],
    activatesOn: ActivationEvents.Startup,
  },
  () => import('./progress-registry.ts'),
);
export const TraceProgressSink = Capability.lazyModule(
  'TraceProgressSink',
  { provides: [Capabilities.TraceSink] },
  () => import('./trace-progress-sink.ts'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface.ts'),
);
export const Translations = AppCapability.translations(translations);
