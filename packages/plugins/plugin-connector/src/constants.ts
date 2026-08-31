//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { meta } from '#meta';

/** Surface id for the sync-targets dialog. */
export const SYNC_TARGETS_DIALOG = DXN.make(`${meta.profile.key}.syncTargetsDialog`);

/** Surface id for the per-provider credential-form dialog (custom tokens, OAuth pre-flight inputs). */
export const PROVIDER_FORM_DIALOG = DXN.make(`${meta.profile.key}.providerFormDialog`);

/** Provider id for manually entered access tokens. */
export const CUSTOM_PROVIDER_ID = 'custom';

/**
 * `localStorage` key prefix for redirect-flow OAuth pending state. The key
 * itself is built via {@link pendingConnectionStorageKey} — call sites
 * shouldn't concatenate the prefix manually.
 */
const CONNECTION_PENDING_KEY_PREFIX = 'dxos:connection-pending:' as const;

/**
 * `localStorage` key for the in-flight OAuth snapshot of the access token
 * identified by `accessTokenId`. The NavigationHandler reads back from this
 * key after the new tab lands on `/redirect/oauth`.
 */
export const pendingConnectionStorageKey = (
  accessTokenId: string,
): `${typeof CONNECTION_PENDING_KEY_PREFIX}${string}` => `${CONNECTION_PENDING_KEY_PREFIX}${accessTokenId}`;

/** URL path Edge redirects to after redirect-flow OAuth completes. */
export const OAUTH_REDIRECT_PATH = '/redirect/oauth' as const;

/** Node id (local segment) for the per-space "Connections" section. */
export const CONNECTIONS_SECTION_ID = 'connections';

/** Graph node type for the per-space "Connections" section under space settings. */
export const CONNECTIONS_SECTION_TYPE = `org.dxos.plugin.connector.space-settings`;

/**
 * Deck navigation subject for a specific connection inside a space — used
 * to open a freshly created connection after the finalization step. The
 * connections section is nested under the space's settings section, so the
 * subject must include the `settings` segment to resolve through the graph.
 */
export const connectionDeckSubject = (spacePath: string, connectionId: string): string =>
  `${connectionsDeckSubject(spacePath)}/${connectionId}`;

/**
 * Deck navigation subject for a space's Connections section itself — where to land when a specific
 * connection stops existing, since its own subject no longer resolves once it is deleted.
 */
export const connectionsDeckSubject = (spacePath: string): string =>
  `${spacePath}/${SpaceSchema.SETTINGS_SECTION_ID}/${CONNECTIONS_SECTION_ID}`;
