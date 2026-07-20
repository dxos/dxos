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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(NavigationHandler),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(Client),
  Plugin.addLazyModule(AccountCache),
  Plugin.addLazyModule(HubHttpClient),
  Plugin.addLazyModule(SchemaDefs),
  Plugin.addLazyModule(Migrations),
  // Runtime event: spaces become ready when the client observes them, not at startup — see the
  // SpaceReplicationProgress module definition.
  Plugin.addLazyModule(SpaceReplicationProgress),
  // Project remote (edge) trace progress into the registry (DX-1125) — see the TraceProgress
  // module definition for its activation gating.
  Plugin.addLazyModule(TraceProgress),
  Plugin.addLazyModule(LayerSpecs),
  // Swarm-backed remote trace source (DX-1125). Collected when the process-manager runtime is built.
  Plugin.addLazyModule(RemoteTraceMonitor),
  Plugin.addLazyModule(ReactSurface),
  Plugin.make,
);

export default ClientPlugin;
