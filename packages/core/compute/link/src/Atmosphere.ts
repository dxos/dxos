//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Connector id for the built-in Atmosphere (atproto) connection: the same atproto OAuth flow as
 * Bluesky but without any sync targets. Also the connector the OAuth account-recovery flow routes
 * its {@link Connection} to.
 */
export const PROVIDER_ID = 'atmosphere';

/**
 * `AccessToken.source` for the Atmosphere connection. atproto accounts are portable — the PDS and
 * handle can change — so we don't pin to a hostname.
 */
export const SOURCE = 'atproto.local';
