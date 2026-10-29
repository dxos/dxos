//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { ObservabilityNamespace } from './src/namespace.ts';
import * as ObservabilityCapabilities from './src/types/ObservabilityCapabilities.ts';
import * as ObservabilityEvents from './src/types/ObservabilityEvents.ts';
import type * as ObservabilityOptions from './src/types/ObservabilityOptions.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<ObservabilityOptions.ObservabilityPluginOptions> =
  Plugin.config<ObservabilityOptions.ObservabilityPluginOptions>({
    plugin: {
      key: ObservabilityNamespace.key,
      name: 'Telemetry',
      author: 'DXOS',
      description: trim`
      Application observability and telemetry collection for monitoring performance and usage patterns.
      Track metrics, logs, and traces for system health and analytics.
    `,
      icon: { key: 'ph--eye--regular' },
      tags: ['system'],
    },
    modules: [
      Capability.lazyModule(
        'ClientReady',
        {
          environments: ['browser', 'tauri'],
          requires: [
            Capabilities.PluginManager,
            Capabilities.OperationInvoker,
            ObservabilityCapabilities.ClientCapability,
            ObservabilityCapabilities.Observability,
            ObservabilityCapabilities.State,
          ],
          provides: [],
          // Reads `client.services` (initialized-only) to wire metrics providers, so it needs the
          // forked client initialization to have completed.
          activatesOn: ObservabilityCapabilities.ClientInitialized,
        },
        () => import('./src/capabilities/client-ready.ts', { with: { type: 'module-url' } }),
      ),
      // `#commands` resolves per condition: only a host with a CLI has anywhere to put them.
      AppCapability.commands(() => import('#commands', { with: { type: 'module-url' } })),
      Capability.lazyModule(
        'InvocationListener',
        {
          requires: [Capabilities.OperationInvoker, AppCapabilities.ObservabilityMapping],
          provides: [],
          // Idle rather than Startup: contributed mappings are read live, so the listener only has to be
          // running before the first user action, not before the plugins that register events.
          activatesOn: ActivationEvents.Idle,
        },
        () => import('./src/capabilities/invocation-listener.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'namespace',
        {
          environments: ['browser', 'node', 'tauri'],
          requires: [],
          provides: [ObservabilityCapabilities.Namespace],
        },
        () => import('./src/capabilities/namespace.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'observability',
        {
          environments: ['browser', 'node', 'tauri'],
          requires: [],
          provides: [ObservabilityCapabilities.Observability],
        },
        () => import('./src/capabilities/observability.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
        provides: [ObservabilityCapabilities.Settings],
        environments: ['browser', 'tauri'],
      }),
      Capability.lazyModule(
        'ObservabilityState',
        {
          environments: ['browser', 'tauri'],
          requires: [Capabilities.AtomRegistry],
          provides: [ObservabilityCapabilities.State],
        },
        () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.operationHandler(() => import('#operation-handler', { with: { type: 'module-url' } })),
      Capability.lazyModule(
        'PrivacyBanner',
        {
          environments: ['browser', 'node', 'tauri'],
          requires: [ObservabilityCapabilities.Namespace],
          provides: [],
          activatesOn: ObservabilityEvents.IdentityCreatedEvent,
        },
        () => import('#privacy-banner', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'PrivacyNotice',
        {
          environments: ['browser', 'tauri'],
          requires: [
            Capabilities.OperationInvoker,
            Capabilities.AtomRegistry,
            ObservabilityCapabilities.State,
            ObservabilityCapabilities.ClientCapability,
          ],
          provides: [],
          // Genuine runtime event: fired imperatively by `plugin-client`'s create-identity operation
          // (mirrored by identifier - see `ObservabilityEvents.IdentityCreatedEvent`).
          activatesOn: ObservabilityEvents.IdentityCreatedEvent,
        },
        () => import('./src/capabilities/privacy-notice.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
        roles: ['org.dxos.role.article'],
      }),
      AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
      // Unconditional `provides`: the body contributes nothing when `downloadLogs` is absent.
      Capability.lazyModule(
        'log-downloader',
        { requires: [], provides: [ObservabilityCapabilities.LogDownloader] },
        () => import('./src/capabilities/log-downloader.ts', { with: { type: 'module-url' } }),
      ),
    ],
  });

export const { meta, make } = config;

export default config;
