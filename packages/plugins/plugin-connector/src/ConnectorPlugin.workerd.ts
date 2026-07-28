//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed],
  }),

  Plugin.make,
);

export default ConnectorPlugin;
