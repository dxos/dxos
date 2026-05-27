//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from './meta';

/** Surface id for the sync-targets dialog. */
export const SYNC_TARGETS_DIALOG = DXN.make(`${DXN.getName(meta.id)}.syncTargetsDialog`);

/** Surface id for the per-provider credential-form dialog (custom tokens, OAuth pre-flight inputs). */
export const PROVIDER_FORM_DIALOG = DXN.make(`${DXN.getName(meta.id)}.providerFormDialog`);

/** Provider id for manually entered access tokens. */
export const CUSTOM_PROVIDER_ID = 'custom';

/**
 * `localStorage` key prefix for redirect-flow OAuth pending state. The key
 * itself is built via {@link pendingIntegrationStorageKey} — call sites
 * shouldn't concatenate the prefix manually.
 */
const INTEGRATION_PENDING_KEY_PREFIX = 'dxos:integration-pending:' as const;

/**
 * `localStorage` key for the in-flight OAuth snapshot of the access token
 * identified by `accessTokenId`. The NavigationHandler reads back from this
 * key after the new tab lands on `/redirect/oauth`.
 */
export const pendingIntegrationStorageKey = (
  accessTokenId: string,
): `${typeof INTEGRATION_PENDING_KEY_PREFIX}${string}` => `${INTEGRATION_PENDING_KEY_PREFIX}${accessTokenId}`;

/** URL path Edge redirects to after redirect-flow OAuth completes. */
export const OAUTH_REDIRECT_PATH = '/redirect/oauth' as const;

/**
 * Deck navigation subject for a specific integration inside a space — used
 * by `navigateToNewIntegration` to open the freshly created integration
 * after the redirect-flow finalization step.
 */
export const integrationDeckSubject = (spacePath: string, integrationId: string): `${string}/integrations/${string}` =>
  `${spacePath}/integrations/${integrationId}`;
