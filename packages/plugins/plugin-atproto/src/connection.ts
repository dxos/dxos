//
// Copyright 2026 DXOS.org
//

import { Connection } from '@dxos/link';
import { ATMOSPHERE_SOURCE, OAuthProvider } from '@dxos/protocols';

/**
 * Connector ids that authenticate against the AT Protocol. The Atmosphere connector this plugin
 * contributes is identified by the OAuth provider it wraps; `bluesky` is plugin-bluesky's —
 * hardcoded here (rather than imported) so this system plugin does not depend on the labs plugin.
 */
export const ATPROTO_CONNECTOR_IDS = new Set<string>([OAuthProvider.ATPROTO, 'bluesky']);

/** `AccessToken.source` values for atproto accounts (atmosphere + bluesky). */
export const ATPROTO_SOURCES = new Set<string>([ATMOSPHERE_SOURCE, 'bsky.app']);

/** Whether a connection authenticates against an atproto PDS. */
export const isAtprotoConnection = (connection: Connection.Connection): boolean =>
  connection.connectorId !== undefined && ATPROTO_CONNECTOR_IDS.has(connection.connectorId);
