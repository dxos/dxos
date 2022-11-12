//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { TimeoutError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { AuthenticationRequest, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { Provider } from '@dxos/util';

import { IdentityManager } from '../identity';
import { AuthenticatingInvitationObservable, CancellableInvitationObservable, InvitationsService } from './invitations';
import { InvitationsHandler } from './invitations-handler';

/**
 * Adapts invitation service observable to client/service stream.
 */
export abstract class AbstractInvitationsService<T = void> implements InvitationsService {
  private readonly _createInvitations = new Map<string, CancellableInvitationObservable>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitationObservable>();

  // prettier-ignore
  protected constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _getInvitationsHandler: Provider<InvitationsHandler<T>>
  ) {}

  // TODO(burdon): Guest/host label.
  getLoggingContext() {
    return {
      deviceKey: this._identityManager.identity?.deviceKey
    };
  }

  abstract getContext(invitation: Invitation): T;

  createInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      const invitationsHandler: InvitationsHandler<T> = this._getInvitationsHandler();
      const context = this.getContext(invitation);
      log('stream opened', this.getLoggingContext());

      let invitationId: string;
      const { type } = invitation;
      const observable = invitationsHandler.createInvitation(context, { type });
      observable.subscribe({
        onConnecting: (invitation) => {
          assert(invitation.invitationId);
          invitationId = invitation.invitationId;
          this._createInvitations.set(invitation.invitationId, observable);
          invitation.state = Invitation.State.CONNECTING;
          next(invitation);
        },
        onConnected: (invitation) => {
          assert(invitation.invitationId);
          invitation.state = Invitation.State.CONNECTED;
          next(invitation);
        },
        onAuthenticating: (invitation) => {
          assert(invitation.invitationId);
          invitation.state = Invitation.State.AUTHENTICATING;
          next(invitation);
        },
        onSuccess: (invitation) => {
          assert(invitation.invitationId);
          invitation.state = Invitation.State.SUCCESS;
          next(invitation);
          close();
        },
        onCancelled: () => {
          assert(invitationId);
          invitation.invitationId = invitationId;
          invitation.state = Invitation.State.CANCELLED;
          next(invitation);
          close();
        },
        onTimeout: (err: TimeoutError) => {
          invitation.state = Invitation.State.TIMEOUT;
          close(err);
        },
        onError: (err: any) => {
          invitation.state = Invitation.State.ERROR;
          close(err);
        }
      });

      return (err?: Error) => {
        const context = this.getLoggingContext();
        if (err) {
          log.warn('stream closed', { ...context, err });
        } else {
          log('stream closed', context);
        }

        this._createInvitations.delete(invitation.invitationId!);
      };
    });
  }

  acceptInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      log('stream opened', this.getLoggingContext());
      const invitationsHandler = this._getInvitationsHandler();

      let invitationId: string;
      const observable = invitationsHandler.acceptInvitation(invitation);
      observable.subscribe({
        onConnecting: (invitation) => {
          assert(invitation.invitationId);
          invitationId = invitation.invitationId;
          this._acceptInvitations.set(invitation.invitationId, observable);
          invitation.state = Invitation.State.CONNECTING;
          next(invitation);
        },
        onConnected: (invitation) => {
          assert(invitation.invitationId);
          invitation.state = Invitation.State.CONNECTED;
          next(invitation);
        },
        onAuthenticating: (invitation) => {
          assert(invitation.invitationId);
          invitation.state = Invitation.State.AUTHENTICATING;
          next(invitation);
        },
        onSuccess: (invitation) => {
          invitation.state = Invitation.State.SUCCESS;
          next(invitation);
          close();
        },
        onCancelled: () => {
          assert(invitationId);
          invitation.invitationId = invitationId;
          invitation.state = Invitation.State.CANCELLED;
          next(invitation);
          close();
        },
        onTimeout: (err: TimeoutError) => {
          invitation.state = Invitation.State.TIMEOUT;
          close(err);
        },
        onError: (err: any) => {
          invitation.state = Invitation.State.ERROR;
          close(err);
        }
      });

      return (err?: Error) => {
        const context = this.getLoggingContext();
        if (err) {
          log.warn('stream closed', { ...context, err });
        } else {
          log('stream closed', context);
        }

        this._acceptInvitations.delete(invitation.invitationId!);
      };
    });
  }

  async authenticate({ invitationId, authenticationCode }: AuthenticationRequest): Promise<void> {
    log('authenticating...');
    assert(invitationId);
    const observable = this._acceptInvitations.get(invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId });
    } else {
      await observable.authenticate(authenticationCode);
    }
  }

  async cancelInvitation(invitation: Invitation): Promise<void> {
    log('cancelling...');
    assert(invitation.invitationId);
    const observable =
      this._createInvitations.get(invitation.invitationId) ?? this._acceptInvitations.get(invitation.invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId: invitation.invitationId });
    } else {
      await observable?.cancel();
    }
  }
}
