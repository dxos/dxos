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
  SchemaDefs,
  SpaceReplicationProgress,
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
  Plugin.addLazyModule(LayerSpecs),
  Plugin.addLazyModule(ReactSurface),
  Plugin.make,
);

export default ClientPlugin;
