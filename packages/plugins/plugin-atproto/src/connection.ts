//
// Copyright 2026 DXOS.org
//

import { ATMOSPHERE_PROVIDER_ID, type Connection } from '@dxos/plugin-connector';

/**
 * Connector ids that authenticate against the AT Protocol. `atmosphere` is plugin-connector's
 * built-in atproto connector; `bluesky` is plugin-bluesky's — hardcoded here (rather than imported)
 * so this system plugin does not depend on the labs bluesky plugin.
 */
export const ATPROTO_CONNECTOR_IDS = new Set<string>([ATMOSPHERE_PROVIDER_ID, 'bluesky']);

/** `AccessToken.source` values for atproto accounts (atmosphere + bluesky). */
export const ATPROTO_SOURCES = new Set<string>(['atproto.local', 'bsky.app']);

/** Whether a connection authenticates against an atproto PDS. */
export const isAtprotoConnection = (connection: Connection.Connection): boolean =>
  connection.connectorId !== undefined && ATPROTO_CONNECTOR_IDS.has(connection.connectorId);
