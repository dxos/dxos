//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection } from '#types';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed])),
  Plugin.make,
);

export default ConnectorPlugin;
