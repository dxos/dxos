//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import {
  AsyncEvents,
  CancellableObservable,
  CancellableObservableEvents,
  Observable,
  CancellableObservableProvider
} from '@dxos/async';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export interface InvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnecting?(invitation: Invitation): void;
  onConnected?(invitation: Invitation): void;
  onSuccess(invitation: Invitation): void;
}

export type InvitationObservable = CancellableObservable<InvitationEvents>;

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
// TODO(burdon): Replace with ObservableInvitationProvider.
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

/**
 * Observable that supports inspection of the current value.
 */
// TODO(burdon): Make generic and move to async/observable.
export interface ObservableInvitation extends CancellableObservable<InvitationEvents> {
  get invitation(): Invitation | undefined;
}

export class ObservableInvitationProvider
  extends CancellableObservableProvider<InvitationEvents>
  implements ObservableInvitation
{
  private _invitation?: Invitation;

  get invitation(): Invitation | undefined {
    return this._invitation;
  }

  setInvitation(invitation: Invitation) {
    this._invitation = invitation;
  }
}
