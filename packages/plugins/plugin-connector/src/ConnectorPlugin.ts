//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';

import {
  AppGraphBuilder,
  BuiltinConnectors,
  Coordinator,
  CreateObject,
  OAuthRedirect,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { Connection } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(BuiltinConnectors),
  Plugin.addModule(Coordinator),
  Plugin.addModule(OAuthRedirect),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default ConnectorPlugin;
