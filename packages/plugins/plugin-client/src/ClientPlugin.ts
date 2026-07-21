//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import {
  AccountCache,
  AppGraphBuilder,
  Client,
  HubHttpClient,
  LayerSpecs,
  Migrations,
  NavigationHandler,
  OperationHandler,
  ReactContext,
  ReactSurface,
  RemoteTraceMonitor,
  SchemaDefs,
  SpaceReplicationProgress,
  TraceProgress,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { type ClientPluginOptions } from '#types';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(NavigationHandler),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactContext),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(Client),
  Plugin.addModule(AccountCache),
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
