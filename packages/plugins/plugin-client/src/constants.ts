//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

export const JOIN_DIALOG = DXN.make(`${meta.profile.key}.joinDialog`);
export const RECOVERY_CODE_DIALOG = DXN.make(`${meta.profile.key}.recoveryCodeDialog`);
export const RESET_DIALOG = DXN.make(`${meta.profile.key}.resetDialog`);

/**
 * Account profile page, where passkeys are revoked and the account is managed.
 *
 * Hub-service serves it from a `composer.space` subdomain rather than `hub.dxos.network` so that
 * passkeys created here — bound to the `composer.space` relying party — can be asserted there.
 * Overridable per deployment via the `DX_ACCOUNT_URL` build environment variable.
 */
export const ACCOUNT_PROFILE_URL = 'https://account.composer.space/profile';
