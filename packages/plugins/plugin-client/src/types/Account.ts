//
// Copyright 2024 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { type Config, getEnvString } from '@dxos/config';

/** Pinned (non-space) workspace ID anchoring the account's graph subtree, and its URL workspace token. */
export const id = 'dxos:account';

/** Panel ids, relative to the account workspace they hang off. Each is also its own singleton URL key. */
export const Profile = 'profile';
export const Devices = 'devices';
export const Security = 'security';
export const Account = 'account';
export const Invitations = 'invitations';
export const Usage = 'usage';

/** The account's own workspace path. */
export const workspacePath = GraphPath.getSpacePath(id);

/** A panel's qualified path, which its surface matches on. */
export const path = (panel: string): string => GraphPath.getSpacePath(id, panel);

/**
 * The hub backing accounts, or `undefined` where none is configured.
 *
 * Its absence is what "this profile has no account service" means, and several plugins branch on it:
 * onboarding skips the auth flow, and the support plugin holds tours back rather than handing a
 * local dev profile one to dismiss per object type. One reading of it so those cannot disagree.
 */
export const getHubUrl = (config?: Config): string | undefined => getEnvString(config, 'DX_HUB_URL');

/** Whether this profile has an account service to authenticate against. */
export const isAuthEnabled = (config?: Config): boolean => !!getHubUrl(config);
