//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { observableError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import {
  AuthenticatingInvitationObservable,
  AuthenticatingInvitationProvider,
  InvitationsProxy,
  InvitationObservable,
  ObservableInvitationProvider
} from './invitations';

/**
 * Adapts invitations service observable to client/service stream.
 * NOTE: Both HALO and Data Spaces use the same client/service interfaces.
 */
// TODO(burdon): Options (e.g., timeout).
export abstract class AbstractInvitationsProxy<T> implements InvitationsProxy<T> {
  // prettier-ignore
  constructor(
    private readonly _invitationsService: InvitationsService
  ) {}

  abstract createInvitationObject(context: T): Invitation;

  createInvitation(context: T): InvitationObservable {
    assert(context);

    let invitationId: string;
    const observable = new ObservableInvitationProvider(async () => {
      if (invitationId) {
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });

    const stream: Stream<Invitation> = this._invitationsService.createInvitation(this.createInvitationObject(context));

    stream.subscribe(
      (invitation: Invitation) => {
        observable.setInvitation(invitation);

        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            assert(invitation.invitationId);
            invitationId = invitation.invitationId;
            observable.callback.onConnecting?.(invitation);
            break;
          }

          case Invitation.State.CONNECTED: {
            observable.callback.onConnected?.(invitation);
            break;
          }

          case Invitation.State.SUCCESS: {
            observable.callback.onSuccess?.(invitation);
            break;
          }

          case Invitation.State.CANCELLED: {
            observable.callback.onCancelled?.();
            break;
          }

          default: {
            log.error(`Invalid state: ${invitation.state}`);
          }
        }
      },
      (err) => {
        if (err) {
          observableError(observable, err);
        }
      }
    );

    return observable;
  }

  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable {
    assert(invitation && invitation.swarmKey);

    let invitationId: string;
    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        if (invitationId) {
          await this._invitationsService.cancelInvitation({ invitationId });
        }
      },

      onAuthenticate: async (code: string) => {}
    });

    const stream: Stream<Invitation> = this._invitationsService.acceptInvitation(invitation);

    stream.subscribe(
      (invitation: Invitation) => {
        assert(invitation.invitationId);
        observable.setInvitation(invitation);

        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            observable.callback.onConnecting?.(invitation);
            break;
          }

          case Invitation.State.CONNECTED: {
            observable.callback.onConnected?.(invitation);
            break;
          }

          case Invitation.State.AUTHENTICATING: {
            observable.callback.onAuthenticating?.(invitation);
            break;
          }

          case Invitation.State.SUCCESS: {
            observable.callback.onSuccess?.(invitation);
            break;
          }

          case Invitation.State.CANCELLED: {
            observable.callback.onCancelled?.();
            break;
          }

          default: {
            log.error(`Invalid state: ${invitation.state}`);
          }
        }
      },
      (err) => {
        if (err) {
          observableError(observable, err);
        }
      }
    );

    return observable;
  }
}
