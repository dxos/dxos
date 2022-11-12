//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { observableError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import {
  AuthenticatingInvitationObservable,
  AuthenticatingInvitationProvider,
  InvitationObservable,
  InvitationObservableProvider,
  InvitationsService
} from './invitations';
import { InvitationsOptions, InvitationsHandler } from './invitations-handler';

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

  abstract getInvitationOptions(context: T): Invitation;

  createInvitation(context: T, options?: InvitationsOptions): InvitationObservable {
    let invitationId: string;
    const observable = new InvitationObservableProvider(async () => {
      if (invitationId) {
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });

    const invitation: Invitation = { ...this.getInvitationOptions(context), ...options };
    const stream: Stream<Invitation> = this._invitationsService.createInvitation(invitation);

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

  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable {
    assert(invitation && invitation.swarmKey);

    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        const invitationId = observable.invitation?.invitationId;
        assert(invitationId);
        await this._invitationsService.cancelInvitation({ invitationId });
      },

      onAuthenticate: async (authenticationCode: string) => {
        const invitationId = observable.invitation?.invitationId;
        assert(invitationId);
        await this._invitationsService.authenticate({ invitationId, authenticationCode });
      }
    });

    const stream: Stream<Invitation> = this._invitationsService.acceptInvitation({ ...invitation, ...options });

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
