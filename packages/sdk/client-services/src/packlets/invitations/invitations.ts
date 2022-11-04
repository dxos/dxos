//
// Copyright 2022 DXOS.org
//

import { AsyncEvents, CancellableObservable, CancellableObservableEvents } from '@dxos/async';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export interface InvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnecting(invitation: Invitation): void;
  onConnected(invitation: Invitation): void;
  onSuccess(invitation: Invitation): void;
}

// TODO(burdon): Create base class.
export interface InvitationsHandler<T> {
  createInvitation(context: T): CancellableObservable<InvitationEvents>;
  acceptInvitation(invitation: Invitation): CancellableObservable<InvitationEvents>;
}

export interface InvitationsProxy<T> extends InvitationsHandler<T> {
  createInvitationObject(context: T): Invitation;
}
