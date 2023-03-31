//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Observable, PushStream } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from './invitations';

/**
 * Create an observable from an RPC stream.
 */
// TODO(wittjosiah): Factor out.
const createObservable = <T>(rpcStream: Stream<T>): Observable<T> => {
  const pushStream = new PushStream<T>();

  rpcStream.subscribe(
    (value: T) => {
      pushStream.next(value);
    },
    (err?: Error) => {
      if (err) {
        pushStream.error(err);
      } else {
        pushStream.complete();
      }
    }
  );

  return pushStream.observable;
};

export class InvitationsProxy {
  // prettier-ignore
  constructor(
    private readonly _invitationsService: InvitationsService,
    private readonly _getContext: () => Partial<Invitation> & Pick<Invitation, 'kind'>
  ) {}

  getInvitationOptions(): Invitation {
    return {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      authMethod: Invitation.AuthMethod.SHARED_SECRET,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random(),
      ...this._getContext()
    };
  }

  createInvitation(options?: Partial<Invitation>): CancellableInvitationObservable {
    const invitation: Invitation = { ...this.getInvitationOptions(), ...options };
    const observable = new CancellableInvitationObservable({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.createInvitation(invitation)),
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });

    return observable;
  }

  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable {
    assert(invitation && invitation.swarmKey);
    const observable = new AuthenticatingInvitationObservable({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.acceptInvitation({ ...invitation })),
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      },
      onAuthenticate: async (authCode: string) => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.authenticate({ invitationId, authCode });
      }
    });

    return observable;
  }
}
