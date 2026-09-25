//
// Copyright 2025 DXOS.org
//

import { Feed } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed];
