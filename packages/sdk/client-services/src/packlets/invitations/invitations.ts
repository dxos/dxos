//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { AsyncEvents, CancellableObservable, CancellableObservableEvents, Observable } from '@dxos/async';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export interface InvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnecting?(invitation: Invitation): void;
  onConnected?(invitation: Invitation): void;
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

/**
 * Util to wrap observable with promise.
 */
// TODO(burdon): How to make interactive?
export const invitationObservable = async (observable: Observable<InvitationEvents>): Promise<Invitation> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = observable.subscribe({
      onSuccess: (invitation: Invitation) => {
        assert(invitation.state === Invitation.State.SUCCESS);
        unsubscribe();
        resolve(invitation);
      },
      onError: (err: Error) => {
        unsubscribe();
        reject(err);
      }
    });
  });
};
