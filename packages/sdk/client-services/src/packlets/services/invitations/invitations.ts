//
// Copyright 2022 DXOS.org
//

import { AsyncEvents, CancellableObservable, CancellableObservableEvents } from '@dxos/async';
import { Space } from '@dxos/echo-db';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export interface CreateInvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnecting(invitation: Invitation): void;
  onConnected(invitation: Invitation): void;
  onSuccess(invitation: Invitation): void;
}

export interface AcceptInvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnecting(invitation: Invitation): void;
  onConnected(invitation: Invitation): void;
  onSuccess(space: Space): void; // TODO(burdon): Pass invitation.
}

// TODO(burdon): Create base class.
export interface InvitationsBroker<T> {
  createInvitation(context: T): CancellableObservable<CreateInvitationEvents>;
  acceptInvitation(invitation: Invitation): CancellableObservable<AcceptInvitationEvents>;
}
