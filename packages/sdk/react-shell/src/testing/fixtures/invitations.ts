//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/react-client';
import { Invitation, CancellableInvitationObservable } from '@dxos/react-client/invitations';

export const inviteWithState = (state: Invitation.State) =>
  new CancellableInvitationObservable({
    initialInvitation: {
      state,
      invitationId: Math.random().toString(16).slice(2),
      kind: Invitation.Kind.SPACE,
      authMethod: Invitation.AuthMethod.NONE,
      swarmKey: PublicKey.random(),
      type: Invitation.Type.INTERACTIVE,
    },
    subscriber: () => {},
    onCancel: async () => {},
  });
