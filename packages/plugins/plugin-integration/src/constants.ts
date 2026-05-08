//
// Copyright 2026 DXOS.org
//

import { meta } from './meta';

/** Surface id for the sync-targets dialog. */
export const SYNC_TARGETS_DIALOG = `${meta.id}.SyncTargetsDialog`;

/** Surface id for the generic provider-credential form dialog. */
export const PROVIDER_FORM_DIALOG = `${meta.id}.ProviderFormDialog`;

/**
 * Surface id for the custom-token entry dialog.
 * @deprecated Alias for {@link PROVIDER_FORM_DIALOG}; retained for one release.
 */
export const CUSTOM_TOKEN_DIALOG = PROVIDER_FORM_DIALOG;

/** Provider id for manually entered access tokens. */
export const CUSTOM_PROVIDER_ID = 'custom';
