//
// Copyright 2023 DXOS.org
//

export {
  AuthenticatingInvitation as AuthenticatingInvitationObservable,
  CancellableInvitation as CancellableInvitationObservable,
  InvitationEncoder,
  type Invitations,
} from '@dxos/client-protocol';

export {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';

export { hostInvitation } from './host';

export { InvitationsProxy } from './invitations-proxy';
