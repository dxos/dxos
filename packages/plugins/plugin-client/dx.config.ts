//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import { trim } from '@dxos/util';

import { ClientNamespace } from './src/namespace.ts';
import * as ClientCapabilities from './src/types/ClientCapabilities.ts';
import * as ClientEvents from './src/types/ClientEvents.ts';
import * as ClientOptions from './src/types/ClientOptions.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<ClientOptions.ClientPluginOptions> = Plugin.config<ClientOptions.ClientPluginOptions>(
  {
    plugin: {
      key: ClientNamespace.key,
      name: 'Client',
      author: 'DXOS',
      description: trim`
      Core client connectivity and peer-to-peer networking infrastructure.
      Manages identity, authentication, and real-time synchronization across devices.
    `,
      tags: ['system'],
    },
    modules: [
      Capability.lazyModule(
        'AccountCache',
        { provides: [ClientCapabilities.AccountCache] },
        () => import('./src/capabilities/account-cache.ts', { with: { type: 'module-url' } }),
      ),
      // Its connectors read `client.halo`/`client.mesh` inside atom computations (initialized-only,
      // and a pre-init throw is not re-evaluated when initialization lands).
      AppCapability.appGraphBuilder(
        () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
        {
          activatesOn: ClientEvents.Initialized,
        },
      ),
      Capability.lazyModule(
        'BootGate',
        {
          activatesOn: ActivationEvents.Startup,
          requires: [Capabilities.AtomRegistry, ClientCapabilities.Client],
          provides: [Capabilities.BootGate],
          environments: ['browser', 'tauri'],
        },
        () => import('./src/capabilities/boot-gate.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'Client',
        {
          // The boot root: everything downstream requires the client, and nothing pulls it in a host that
          // has not asked for it yet — so it names the startup wave rather than inheriting the idle default.
          activatesOn: ActivationEvents.Startup,
          provides: [
            ClientCapabilities.Client,
            ClientCapabilities.InitializeTimeout,
            Capabilities.Layer,
            ClientCapabilities.IdentityService,
            ClientCapabilities.SpaceService,
            AppCapabilities.UnsavedChanges,
          ],
          environments: ['browser', 'node', 'tauri'],
        },
        () => import('./src/capabilities/client.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'ClientServices',
        {
          requires: [ClientCapabilities.Client],
          provides: [ClientCapabilities.Config, ClientCapabilities.EdgeHttpClient, ClientCapabilities.Hypergraph],
          // `client.config` and `client.edge` are initialized-only.
          activatesOn: ClientEvents.Initialized,
        },
        () => import('./src/capabilities/client-services.ts', { with: { type: 'module-url' } }),
      ),
      // `#commands` resolves per condition: a node host has the OAuth callback server and filesystem the
      // browser command set omits (`account`, `profile`).
      AppCapability.commands(() => import('#commands', { with: { type: 'module-url' } })),
      Capability.lazyModule(
        'HubHttpClient',
        {
          requires: [ClientCapabilities.Client],
          provides: [ClientCapabilities.HubHttpClient],
          // Reads `client.config` (initialized-only) for the hub URL.
          activatesOn: ClientEvents.Initialized,
        },
        () => import('./src/capabilities/hub-http-client.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'IdentityLifecycle',
        {
          requires: [
            ClientCapabilities.Client,
            ClientCapabilities.AccountCache,
            Capabilities.AtomRegistry,
            Capabilities.OperationInvoker,
            Capabilities.PluginManager,
          ],
          provides: [],
          // Subscribes to `client.halo` (initialized-only).
          activatesOn: ClientEvents.Initialized,
        },
        () => import('./src/capabilities/identity-lifecycle.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'IndexProgress',
        {
          requires: [ClientCapabilities.Client],
          provides: [],
          activatesOn: ClientEvents.Initialized,
        },
        () => import('./src/capabilities/index-progress.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.layerSpec(() => import('./src/capabilities/layer-specs.ts', { with: { type: 'module-url' } }), {
        name: 'LayerSpecs',
      }),
      Capability.lazyModule(
        'Migrations',
        {
          requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, ClientCapabilities.Migration],
          provides: [],
          // The immediate subscription reads `client.spaces` synchronously, so this needs the forked
          // client initialization to have completed — the same point it ran at when the startup pass
          // awaited initialize.
          activatesOn: ClientEvents.Initialized,
          environments: ['browser', 'node', 'tauri'],
        },
        () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.navigationHandler(
        () => import('./src/capabilities/navigation-handler/navigation-handler.ts', { with: { type: 'module-url' } }),
        {
          requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
        },
      ),
      Capability.lazyModule(
        'NavigationTargetLoader',
        { requires: [ClientCapabilities.Client], provides: [AppCapabilities.NavigationTargetLoader] },
        () => import('./src/capabilities/navigation-target-loader.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.operationHandler(
        () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.reactContext(
        () => import('./src/capabilities/react-context.tsx', { with: { type: 'module-url' } }),
      ),
      AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
        roles: [AppRole.Article, AppRole.ContactPicker, AppRole.Dialog, AppRole.SpaceInvitation],
      }),
      // Swarm-backed remote trace source (DX-1125). Collected when the process-manager runtime is built.
      Capability.lazyModule(
        'RemoteTraceMonitor',
        // Startup: the process-manager runtime snapshots this capability once, in the Startup pass, and
        // bakes a no-op remote source if it has not been contributed yet — demand activation always loses
        // that race, silencing remote traces for every Process.Manager consumer.
        { provides: [Capabilities.RemoteTraceMonitor], activatesOn: ActivationEvents.Startup },
        () => import('./src/capabilities/remote-trace-monitor.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'SchemaDefs',
        {
          requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, AppCapabilities.Schema],
          provides: [ClientCapabilities.SchemaRegistered],
          environments: ['browser', 'node', 'tauri'],
        },
        () => import('./src/capabilities/schema-defs.ts', { with: { type: 'module-url' } }),
      ),
      // Runtime event: spaces become ready when the client observes them, not at startup — see the
      // SpaceReplicationProgress module definition.
      Capability.lazyModule(
        'SpaceReplicationProgress',
        {
          // ProgressRegistry is read optionally in the body, not required: a host that omits
          // plugin-progress should lose the meter, not fail to activate ClientPlugin.
          requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
          provides: [],
          // Runtime event: spaces become ready when the client observes them, not at startup.
          activatesOn: ClientEvents.SpacesAvailable,
        },
        () => import('./src/capabilities/space-replication-progress.ts', { with: { type: 'module-url' } }),
      ),
      // Project remote (EDGE) trace progress into the registry (DX-1125) — see the TraceProgress
      // module definition for its activation gating.
      Capability.lazyModule(
        'TraceProgress',
        {
          // ProgressRegistry is resolved lazily per message (a host without it degrades to a no-op sink).
          requires: [Capabilities.ProcessManager, Capabilities.ProcessManagerRuntime, Capabilities.ServiceResolver],
          provides: [],
          // Same activation as SpaceReplicationProgress: process-manager runtime, monitor, and
          // registry are all available by the time spaces are observed.
          activatesOn: ClientEvents.SpacesAvailable,
        },
        () => import('./src/capabilities/trace-progress.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    ],
  },
);

export const { meta, make } = config;

export default config;
