//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Feed } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';

export const Schema = AppCapability.schema([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed]);
