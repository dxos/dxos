//
// Copyright 2026 DXOS.org
//

import { meta } from './meta';

/** Surface id for the sync-targets dialog. */
export const SYNC_TARGETS_DIALOG = `${meta.id}.SyncTargetsDialog`;

/** Surface id for the per-provider credential-form dialog (custom tokens, OAuth pre-flight inputs). */
export const PROVIDER_FORM_DIALOG = `${meta.id}.ProviderFormDialog`;

/**
 * Surface id for the custom-token entry dialog.
 * @deprecated Alias for {@link PROVIDER_FORM_DIALOG}.
 */
export const CUSTOM_TOKEN_DIALOG = PROVIDER_FORM_DIALOG;

/** Provider id for manually entered access tokens. */
export const CUSTOM_PROVIDER_ID = 'custom';

/** Provider id for atproto OAuth (e.g. Bluesky). */
export const ATPROTO_PROVIDER_ID = 'atproto';

/**
 * `localStorage` key prefix for redirect-flow OAuth pending state.
 * Persisted under `${INTEGRATION_PENDING_KEY_PREFIX}${accessTokenId}` so
 * the NavigationHandler can recover after the new tab loads from
 * `/redirect/oauth`.
 */
export const INTEGRATION_PENDING_KEY_PREFIX = 'dxos:integration-pending:';

/** URL path Edge redirects to after redirect-flow OAuth completes. */
export const OAUTH_REDIRECT_PATH = '/redirect/oauth';
