//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ClientCapabilities, ClientEvents, type ClientPluginOptions } from '#types';

export const AccountCache = Capability.lazyModule(
  'AccountCache',
  { provides: [ClientCapabilities.AccountCache] },
  () => import('./account-cache'),
);
// Its connectors read `client.halo`/`client.mesh` inside atom computations (initialized-only,
// and a pre-init throw is not re-evaluated when initialization lands).
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ClientEvents.Initialized,
});
export const HubHttpClient = Capability.lazyModule(
  'HubHttpClient',
  {
    requires: [ClientCapabilities.Client],
    provides: [ClientCapabilities.HubHttpClient],
    // Reads `client.config` (initialized-only) for the hub URL.
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./hub-http-client'),
);
export const Client = Capability.lazyModule(
  'Client',
  {
    provides: [
      ClientCapabilities.Client,
      Capabilities.Layer,
      ClientCapabilities.IdentityService,
      ClientCapabilities.SpaceService,
    ],
  },
  () => import('./client'),
);
export const LayerSpecs = Capability.lazyModule(
  'LayerSpecs',
  { provides: [Capabilities.LayerSpec] },
  () => import('./layer-specs'),
);
export const Migrations = Capability.lazyModule(
  'Migrations',
  {
    requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, ClientCapabilities.Migration],
    provides: [],
    // The immediate subscription reads `client.spaces` synchronously, so this needs the forked
    // client initialization to have completed — the same point it ran at when the startup pass
    // awaited initialize.
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./migrations'),
);
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const NavigationTargetLoader = Capability.lazyModule(
  'NavigationTargetLoader',
  { requires: [ClientCapabilities.Client], provides: [AppCapabilities.NavigationTargetLoader] },
  () => import('./navigation-target-loader'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactContext = AppCapability.reactContext(() => import('./react-context'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
  props: ({
    shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    invitationPath = '/',
    invitationProp = 'deviceInvitationCode',
    onReset,
  }: ClientPluginOptions) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
      baseUrl.searchParams.set(invitationProp, invitationCode);
      return baseUrl.toString();
    };
    return { createInvitationUrl, onReset };
  },
});
export const SchemaDefs = Capability.lazyModule(
  'SchemaDefs',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, AppCapabilities.Schema], provides: [] },
  () => import('./schema-defs'),
);
export const RemoteTraceMonitor = Capability.lazyModule(
  'RemoteTraceMonitor',
  { provides: [Capabilities.RemoteTraceMonitor] },
  () => import('./remote-trace-monitor'),
);
export const SpaceReplicationProgress = Capability.lazyModule(
  'SpaceReplicationProgress',
  {
    // ProgressRegistry is read optionally in the body, not required: a host that omits
    // plugin-progress should lose the meter, not fail to activate ClientPlugin.
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [],
    // Runtime event: spaces become ready when the client observes them, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./space-replication-progress'),
);
export const TraceProgress = Capability.lazyModule(
  'TraceProgress',
  {
    // ProgressRegistry is resolved lazily per trace message, so a host without it degrades to a
    // no-op sink rather than failing to activate.
    requires: [Capabilities.ProcessMonitor, Capabilities.ProcessManagerRuntime, Capabilities.ServiceResolver],
    provides: [],
    // Same activation as SpaceReplicationProgress: process-manager runtime, monitor, and
    // registry are all available by the time spaces are observed.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./trace-progress'),
);
