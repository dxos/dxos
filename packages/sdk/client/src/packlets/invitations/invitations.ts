//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { AsyncEvents, CancellableObservableEvents, MulticastObservable, Observable, Subscriber } from '@dxos/async';
import type { Stream } from '@dxos/codec-protobuf';
import { AuthenticationRequest, CancelInvitationRequest, Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const AUTHENTICATION_CODE_LENGTH = 6;

export const INVITATION_TIMEOUT = 3 * 60_000; // 3 mins.

// TODO(burdon): Don't close until RPC has complete (bug).
export const ON_CLOSE_DELAY = 1000;

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
 */
export class CancellableInvitationObservable extends MulticastObservable<Invitation> {
  private readonly _onCancel: () => Promise<void>;

  constructor({
    subscriber,
    initialInvitation,
    onCancel
  }: {
    subscriber: Observable<Invitation> | Subscriber<Invitation>;
    initialInvitation: Invitation;
    onCancel: () => Promise<void>;
  }) {
    super(subscriber, initialInvitation);
    this._onCancel = onCancel;
  }

  cancel(): Promise<void> {
    return this._onCancel();
  }
}

/**
 * Cancelable observer that relays authentication requests.
 */
export class AuthenticatingInvitationObservable extends CancellableInvitationObservable {
  private readonly _onAuthenticate: (authenticationCode: string) => Promise<void>;

  constructor({
    subscriber,
    initialInvitation,
    onCancel,
    onAuthenticate
  }: {
    subscriber: Observable<Invitation> | Subscriber<Invitation>;
    initialInvitation: Invitation;
    onCancel: () => Promise<void>;
    onAuthenticate: (authenticationCode: string) => Promise<void>;
  }) {
    super({ subscriber, initialInvitation, onCancel });
    this._onAuthenticate = onAuthenticate;
  }

  async authenticate(authenticationCode: string): Promise<void> {
    return this._onAuthenticate(authenticationCode);
  }
}

/**
 * Testing util to wrap non-authenticating observable with promise.
 * Don't use this in production code.
 * @deprecated
 */
// TODO(wittjosiah): Move to testing.
export const wrapObservable = async (observable: CancellableInvitationObservable): Promise<Invitation> => {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe(
      (invitation: Invitation | undefined) => {
        // TODO(burdon): Throw error if auth requested.
        assert(invitation?.state === Invitation.State.SUCCESS);
        subscription.unsubscribe();
        resolve(invitation);
      },
      (err: Error) => {
        subscription.unsubscribe();
        reject(err);
      }
    );
  });
};
