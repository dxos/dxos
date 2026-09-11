//
// Copyright 2024 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

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
