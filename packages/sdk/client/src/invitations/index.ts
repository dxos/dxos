//
// Copyright 2023 DXOS.org
//

export {
  type Invitations,
  AuthenticatingInvitation as AuthenticatingInvitationObservable,
  CancellableInvitation as CancellableInvitationObservable,
  InvitationEncoder,
} from '@dxos/client-protocol';

export { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export { hostInvitation } from './host';

export { InvitationsProxy } from './invitations-proxy';
