//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/react-client';
import { CancellableInvitationObservable, Invitation } from '@dxos/react-client/invitations';

export const inviteWithState = (state: Invitation.State) =>
  new CancellableInvitationObservable({
    initialInvitation: {
      state,
      invitationId: Math.random().toString(16).slice(2),
      kind: Invitation.Kind.SPACE,
      authMethod: Invitation.AuthMethod.NONE,
      swarmKey: PublicKey.random(),
      type: Invitation.Type.INTERACTIVE,
      authCode: [Invitation.State.READY_FOR_AUTHENTICATION, Invitation.State.AUTHENTICATING].includes(state)
        ? '123456'
        : '',
    },
    subscriber: () => {},
    onCancel: async () => {},
  });
