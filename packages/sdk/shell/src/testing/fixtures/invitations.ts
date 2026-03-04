//
// Copyright 2023 DXOS.org
//

import { create, encodePublicKey } from '@dxos/protocols/buf';
import {
  InvitationSchema,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { PublicKey } from '@dxos/react-client';
import { CancellableInvitationObservable } from '@dxos/react-client/invitations';

export const inviteWithState = (state: Invitation_State) =>
  new CancellableInvitationObservable({
    initialInvitation: create(InvitationSchema, {
      state,
      invitationId: Math.random().toString(16).slice(2),
      kind: Invitation_Kind.SPACE,
      authMethod: Invitation_AuthMethod.NONE,
      swarmKey: encodePublicKey(PublicKey.random()),
      type: Invitation_Type.INTERACTIVE,
      authCode: [Invitation_State.READY_FOR_AUTHENTICATION, Invitation_State.AUTHENTICATING].includes(state)
        ? '123456'
        : '',
    }),
    subscriber: () => {},
    onCancel: async () => {},
  });
