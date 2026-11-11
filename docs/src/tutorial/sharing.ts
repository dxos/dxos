//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import {
  InvitationEncoder,
  Invitation_AuthMethod,
  Invitation_State,
} from '@dxos/client/invitations';
import { SpaceId } from '@dxos/keys';

// #region invite
/** Invites a peer to `space`, and resolves with the code to send them. */
export const createInvite = (space: Space) =>
  new Promise<string>((resolve) => {
    const invitation = space.share({ authMethod: Invitation_AuthMethod.NONE });
    invitation.subscribe((invitation) => {
      if (invitation.state === Invitation_State.CONNECTING) {
        resolve(InvitationEncoder.encode(invitation));
      }
    });
  });
// #endregion

// #region join
/** Joins the space `code` invites to, and resolves with it once it is open. */
export const acceptInvite = async (client: Client, code: string) => {
  const invitation = client.spaces.join(InvitationEncoder.decode(code));
  const { spaceId } = await invitation.wait();
  if (!SpaceId.isValid(spaceId)) {
    throw new Error('The invitation names no space.');
  }
  // The space joins the client's list a moment after the invitation succeeds.
  const space =
    client.spaces.get(spaceId) ??
    (await new Promise<Space>((resolve) => {
      const subscription = client.spaces.subscribe(() => {
        const space = client.spaces.get(spaceId);
        if (space) {
          subscription.unsubscribe();
          resolve(space);
        }
      });
    }));
  await space.waitUntilReady();
  return space;
};
// #endregion
