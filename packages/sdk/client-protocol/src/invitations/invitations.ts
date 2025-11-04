//
// Copyright 2022 DXOS.org
//

import { MulticastObservable, type Observable, type Subscriber } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const AUTHENTICATION_CODE_LENGTH = 6;

export const INVITATION_TIMEOUT = 3 * 60_000; // 3 mins.

export interface Invitations {
  created: MulticastObservable<CancellableInvitation[]>;
  accepted: MulticastObservable<AuthenticatingInvitation[]>;
  share(options?: Partial<Invitation>): CancellableInvitation;
  join(invitation: Invitation): AuthenticatingInvitation;
}

/**
 * Base class for all invitation observables and providers.
 */
export class CancellableInvitation extends MulticastObservable<Invitation> {
  private readonly _onCancel: () => Promise<void>;

  constructor({
    subscriber,
    initialInvitation,
    onCancel,
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

  get expired() {
    const expiration = getExpirationTime(this.get());
    return expiration && expiration.getTime() < Date.now();
  }

  get expiry() {
    return getExpirationTime(this.get());
  }
}

/**
 * Cancelable observer that relays authentication requests.
 */
export class AuthenticatingInvitation extends CancellableInvitation {
  private readonly _onAuthenticate: (authCode: string) => Promise<void>;

  constructor({
    subscriber,
    initialInvitation,
    onCancel,
    onAuthenticate,
  }: {
    subscriber: Observable<Invitation> | Subscriber<Invitation>;
    initialInvitation: Invitation;
    onCancel: () => Promise<void>;
    onAuthenticate: (authCode: string) => Promise<void>;
  }) {
    super({ subscriber, initialInvitation, onCancel });
    this._onAuthenticate = onAuthenticate;
  }

  async authenticate(authCode: string): Promise<void> {
    return this._onAuthenticate(authCode);
  }
}

/**
 * Testing util to wrap non-authenticating observable with promise.
 * Don't use this in production code.
 * @deprecated
 */
// TODO(wittjosiah): Move to testing.
export const wrapObservable = async (observable: CancellableInvitation): Promise<Invitation> =>
  new Promise((resolve, reject) => {
    const subscription = observable.subscribe(
      (invitation: Invitation | undefined) => {
        // TODO(burdon): Throw error if auth requested.
        invariant(invitation?.state === Invitation.State.SUCCESS);
        subscription.unsubscribe();
        resolve(invitation);
      },
      (err: Error) => {
        subscription.unsubscribe();
        reject(err);
      },
    );
  });

export const getExpirationTime = (invitation: Partial<Invitation>): Date | undefined => {
  if (!(invitation.created && invitation.lifetime)) {
    return;
  }
  return new Date(invitation.created.getTime() + invitation.lifetime * 1000);
};
