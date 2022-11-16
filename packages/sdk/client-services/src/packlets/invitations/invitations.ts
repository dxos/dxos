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
import type { Stream } from '@dxos/codec-protobuf';
import { AuthenticationRequest, CancelInvitationRequest, Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const AUTHENTICATION_CODE_LENGTH = 6;

export const INVITATION_TIMEOUT = 3 * 60_000; // 3 mins.

// TODO(burdon): Don't close until RPC has complete (bug).
export const ON_CLOSE_DELAY = 500;

export interface InvitationsService {
  createInvitation(invitation: Invitation): Stream<Invitation>;
  authenticate(request: AuthenticationRequest): Promise<void>;
  acceptInvitation(invitation: Invitation): Stream<Invitation>;
  cancelInvitation(request: CancelInvitationRequest): Promise<void>;
}

/**
 * Common invitation events (callbacks) for creating and accepting invitations.
 */
// TODO(burdon): Remove optionals.
export interface InvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnecting?(invitation: Invitation): void;
  onConnected?(invitation: Invitation): void;
  onAuthenticating?(invitation: Invitation): void;
  onSuccess(invitation: Invitation): void; // TODO(burdon): Collides with AsyncEvents.
}

/**
 * Base class for all invitation observables and providers.
 * Observable that supports inspection of the current value.
 */
export interface InvitationObservable extends CancellableObservable<InvitationEvents> {
  get invitation(): Invitation | undefined;
}

export class InvitationObservableProvider
  extends CancellableObservableProvider<InvitationEvents>
  implements InvitationObservable
{
  private _invitation?: Invitation;

  get invitation(): Invitation | undefined {
    return this._invitation;
  }

  setInvitation(invitation: Invitation) {
    this._invitation = invitation;
  }
}

/**
 * Cancelable observer.
 */
export type CancellableInvitationObservable = InvitationObservable;

/**
 * Cancelable observer that relays authentication requests.
 */
export interface AuthenticatingInvitationObservable extends CancellableInvitationObservable {
  authenticate(code: string): Promise<void>;
}

export interface AuthenticatingInvitationProviderActions {
  onCancel(): Promise<void>;
  onAuthenticate(code: string): Promise<void>;
}

export class AuthenticatingInvitationProvider
  extends InvitationObservableProvider
  implements AuthenticatingInvitationObservable
{
  // prettier-ignore
  constructor(
    private readonly _actions: AuthenticatingInvitationProviderActions
  ) {
    super(() => this._actions.onCancel());
  }

  async authenticate(authenticationCode: string): Promise<void> {
    return this._actions.onAuthenticate(authenticationCode);
  }
}

/**
 * Util to wrap observable with promise.
 * @deprecated
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
