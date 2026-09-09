//
// Copyright 2024 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

export const id = 'account';

/**
 * Panel ids, relative to the account workspace they hang off. Each is also its own singleton URL
 * key, which requires the node's terminal segment to be the key itself.
 */
export const Profile = 'profile';
export const Devices = 'devices';
export const Security = 'security';
export const Account = 'account';
export const Invitations = 'invitations';
export const Usage = 'usage';

/** The account's own workspace path, which the panels hang off. */
export const workspacePath = GraphPath.getSpacePath(id);

/** A panel's qualified path, which is what its surface matches on. */
export const path = (panel: string): string => GraphPath.getSpacePath(id, panel);
