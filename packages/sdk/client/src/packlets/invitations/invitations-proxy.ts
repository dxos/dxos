//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Observable, PushStream } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable, InvitationsService } from './invitations';
import { InvitationsOptions, InvitationsHandler } from './invitations-handler';

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

/**
 * Adapts invitations service observable to client/service stream.
 * Common base class for HALO and Spaces implementations.
 */
export interface InvitationsProxy<T = void> extends InvitationsHandler<T> {
  getInvitationOptions(context: T): Invitation;
}

export abstract class AbstractInvitationsProxy<T = void> implements InvitationsProxy<T> {
  // prettier-ignore
  constructor(
    private readonly _invitationsService: InvitationsService
  ) {}

  getInvitationOptions(context: T): Invitation {
    return {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      authMethod: AuthMethod.SHARED_SECRET,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random()
    };
  }

  createInvitation(context: T, options?: InvitationsOptions): CancellableInvitationObservable {
    const invitation: Invitation = { ...this.getInvitationOptions(context), ...options };
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

  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable {
    assert(invitation && invitation.swarmKey);
    const observable = new AuthenticatingInvitationObservable({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.acceptInvitation({ ...invitation, ...options })),
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      },
      onAuthenticate: async (authenticationCode: string) => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.authenticate({ invitationId, authenticationCode });
      }
    });

    return observable;
  }
}
