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
} from '#capabilities';
import { meta } from '#meta';
import { ClientOptions } from '#types';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const ClientPlugin = Plugin.define<ClientOptions.ClientPluginOptions>(meta).pipe(
  Plugin.addModule(Commands),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(NavigationHandler),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactContext),
  Plugin.addModule(Translations),
  Plugin.addModule(Client),
  Plugin.addModule(AccountCache),
  Plugin.addModule(NavigationTargetLoader),
  Plugin.addModule(HubHttpClient),
  Plugin.addModule(SchemaDefs),
  Plugin.addModule(Migrations),
  // Runtime event: spaces become ready when the client observes them, not at startup — see the
  // SpaceReplicationProgress module definition.
  Plugin.addModule(SpaceReplicationProgress),
  // Project remote (edge) trace progress into the registry (DX-1125) — see the TraceProgress
  // module definition for its activation gating.
  Plugin.addModule(TraceProgress),
  Plugin.addModule(LayerSpecs),
  // Swarm-backed remote trace source (DX-1125). Collected when the process-manager runtime is built.
  Plugin.addModule(RemoteTraceMonitor),
  Plugin.addModule(ReactSurface),
  Plugin.make,
);

export default ClientPlugin;
