//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';
import { SETTINGS_SECTION_ID } from '@dxos/plugin-space/types';

import { meta } from './meta';

/** Surface id for the sync-targets dialog. */
export const SYNC_TARGETS_DIALOG = DXN.make(`${meta.id}.syncTargetsDialog`);

/** Surface id for the per-provider credential-form dialog (custom tokens, OAuth pre-flight inputs). */
export const PROVIDER_FORM_DIALOG = DXN.make(`${meta.id}.providerFormDialog`);

/** Provider id for manually entered access tokens. */
export const CUSTOM_PROVIDER_ID = 'custom';

/**
 * `IntegrationProvider.id` for the built-in Atmosphere (atproto) integration: the same atproto OAuth
 * flow as Bluesky but without any sync targets. Also the provider the OAuth account-recovery flow
 * routes its Integration to.
 */
export const ATMOSPHERE_PROVIDER_ID = 'atmosphere';

/**
 * `AccessToken.source` for the Atmosphere integration. atproto accounts are portable — the PDS and
 * handle can change — so we don't pin to a hostname.
 */
export const ATMOSPHERE_SOURCE = 'atproto.local';

/**
 * atproto OAuth scopes for the Atmosphere integration and the account-recovery flows.
 * `transition:generic` grants full offline-access so the stored token is usable for space
 * operations; `transition:email` exposes the verified email the recovery flow binds the Account to.
 */
export const ATPROTO_OAUTH_SCOPES = ['atproto', 'transition:generic', 'transition:email'] as const;

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

/** Node id (local segment) for the per-space "Integrations" section. */
export const INTEGRATIONS_SECTION_ID = 'integrations';

/** Graph node type for the per-space "Integrations" section under space settings. */
export const INTEGRATIONS_SECTION_TYPE = `org.dxos.plugin.integration.space-settings`;

/**
 * Deck navigation subject for a specific integration inside a space — used
 * by `navigateToNewIntegration` to open the freshly created integration
 * after the finalization step. The integrations section is nested under the
 * space's settings section, so the subject must include the `settings`
 * segment to resolve through the graph.
 */
export const integrationDeckSubject = (spacePath: string, integrationId: string): string =>
  `${spacePath}/${SETTINGS_SECTION_ID}/${INTEGRATIONS_SECTION_ID}/${integrationId}`;
