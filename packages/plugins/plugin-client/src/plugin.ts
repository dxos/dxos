//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AccountCache,
  AppGraphBuilder,
  Client,
  Commands,
  HubHttpClient,
  IdentityLifecycle,
  InboxMonitor,
  LayerSpecs,
  Migrations,
  NavigationHandler,
  NavigationTargetLoader,
  OperationHandler,
  ReactContext,
  ReactSurface,
  RemoteTraceMonitor,
  SchemaDefs,
  SpaceReplicationProgress,
  TraceProgress,
  Translations,
  WorkerServices,
} from '#capabilities';
import { meta } from '#meta';
import { ClientOptions } from '#types';

export const ClientPlugin = Plugin.define<ClientOptions.ClientPluginOptions>(meta).pipe(
  Plugin.addModule(AccountCache),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Client),
  Plugin.addModule(Commands),
  Plugin.addModule(HubHttpClient),
  Plugin.addModule(IdentityLifecycle),
  Plugin.addModule(InboxMonitor),
  Plugin.addModule(LayerSpecs),
  Plugin.addModule(Migrations),
  Plugin.addModule(NavigationHandler),
  Plugin.addModule(NavigationTargetLoader),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactContext),
  Plugin.addModule(ReactSurface),
  // Swarm-backed remote trace source (DX-1125). Collected when the process-manager runtime is built.
  Plugin.addModule(RemoteTraceMonitor),
  Plugin.addModule(SchemaDefs),
  // Runtime event: spaces become ready when the client observes them, not at startup — see the
  // SpaceReplicationProgress module definition.
  Plugin.addModule(SpaceReplicationProgress),
  // Project remote (edge) trace progress into the registry (DX-1125) — see the TraceProgress
  // module definition for its activation gating.
  Plugin.addModule(TraceProgress),
  Plugin.addModule(Translations),
).pipe(
  // Served from the dedicated worker; see the module definition. A second `pipe`, since one takes 20 steps at most.
  Plugin.addModule(WorkerServices),
  Plugin.make,
);

export default ClientPlugin;
