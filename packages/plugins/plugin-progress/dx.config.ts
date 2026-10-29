//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { ProgressNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ProgressNamespace.key,
    name: 'Progress',
    author: 'DXOS',
    description: trim`
      Hosts the progress-monitor capability: a registry of live progress providers exposed as
      reactive atoms, plus an R0 status-indicator popover that lists all active providers.
    `,
    tags: ['system'],
  },
  modules: [
    // Definitions only - bodies load lazily so the plugin definition stays out of the boot
    // evaluation floor (this def chunk was 177 kB when the bodies were inline).
    Capability.lazyModule(
      'ProgressRegistry',
      // Startup: every consumer reads the registry optionally, so no dependency edge ever pulls this module.
      {
        requires: [Capabilities.AtomRegistry],
        provides: [AppCapabilities.ProgressRegistry],
        activatesOn: ActivationEvents.Startup,
      },
      () => import('./src/capabilities/progress-registry.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'ReactSurface',
      { provides: [Capabilities.ReactSurface] },
      () => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'TraceProgressSink',
      { provides: [Capabilities.TraceSink] },
      () => import('./src/capabilities/trace-progress-sink.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
