//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection, SyncBinding } from '#types';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      AccessToken.AccessToken,
      Connection.Connection,
      Cursor.Cursor,
      Feed.Feed,
      SyncBinding.SyncBinding,
      // Registered so a legacy 0.1.0 binding can still be decoded (migration runs in the app/node).
      SyncBinding.SyncBindingV1,
    ],
  }),

  Plugin.make,
);

export default ConnectorPlugin;
