//
// Copyright 2024 DXOS.org
//

import { type Config, getEnvString } from '@dxos/config';

// TODO(wittjosiah): Cannot use slashes in ids until we have a router which decouples ids from url paths.
const _id = 'dxos.org.plugin.client.account';
// TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
//  Ideally this should be worked into the data model in a generic way.
export const id = `!${_id}`;

export const Profile = `${_id}.profile`;
export const Devices = `${_id}.devices`;
export const Security = `${_id}.security`;
export const Account = `${_id}.account`;
export const Invitations = `${_id}.invitations`;
export const Usage = `${_id}.usage`;

/**
 * Whether this deployment arms the account login page — the welcome screen, the account panels
 * above, and the sign-up gate. Opt-in so a local build boots straight into a local identity, with
 * no account to redeem against a deployed hub.
 */
export const showLoginPage = (config: Config | undefined): boolean =>
  getEnvString(config, 'DX_SHOW_LOGIN_PAGE') === 'true';
