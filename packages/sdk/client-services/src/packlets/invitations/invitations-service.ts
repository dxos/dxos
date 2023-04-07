//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { AuthenticationRequest, Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import { InvitationProtocol } from './invitation-protocol';
import { InvitationsHandler } from './invitations-handler';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class InvitationsServiceImpl implements InvitationsService {
  private readonly _createInvitations = new Map<string, CancellableInvitationObservable>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitationObservable>();

  constructor(
    private readonly _invitationsHandler: InvitationsHandler,
    private readonly _getHandler: (invitation: Invitation) => InvitationProtocol
  ) {}

  // TODO(burdon): Guest/host label.
  getLoggingContext() {
    return {
      // deviceKey: this._identityManager.identity?.deviceKey
    };
  }

  createInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      const handler = this._getHandler(invitation);
      log('stream opened', this.getLoggingContext());

      let invitationId: string;
      const observable = this._invitationsHandler.createInvitation(handler, invitation);
      observable.subscribe(
        (invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              assert(invitation.invitationId);
              invitationId = invitation.invitationId;
              this._createInvitations.set(invitation.invitationId, observable);
              invitation.state = Invitation.State.CONNECTING;
              next(invitation);
              break;
            }
            case Invitation.State.CONNECTED: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.CONNECTED;
              next(invitation);
              break;
            }
            case Invitation.State.READY_FOR_AUTHENTICATION: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.READY_FOR_AUTHENTICATION;
              next(invitation);
              break;
            }
            case Invitation.State.AUTHENTICATING: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.AUTHENTICATING;
              next(invitation);
              break;
            }
            case Invitation.State.SUCCESS: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.SUCCESS;
              next(invitation);
              break;
            }
            case Invitation.State.CANCELLED: {
              assert(invitationId);
              invitation.invitationId = invitationId;
              invitation.state = Invitation.State.CANCELLED;
              next(invitation);
              break;
            }
            case Invitation.State.TIMEOUT: {
              assert(invitationId);
              invitation.invitationId = invitationId;
              invitation.state = Invitation.State.TIMEOUT;
              next(invitation);
              break;
            }
          }
        },
        (err: Error) => {
          close(err);
        },
        () => {
          close();
        }
      );

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
      const handler = this._getHandler(invitation);

      let invitationId: string;
      const observable = this._invitationsHandler.acceptInvitation(handler, invitation);
      observable.subscribe(
        (invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              assert(invitation.invitationId);
              invitationId = invitation.invitationId;
              this._acceptInvitations.set(invitation.invitationId, observable);
              invitation.state = Invitation.State.CONNECTING;
              next(invitation);
              break;
            }
            case Invitation.State.CONNECTED: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.CONNECTED;
              next(invitation);
              break;
            }
            case Invitation.State.READY_FOR_AUTHENTICATION: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.READY_FOR_AUTHENTICATION;
              next(invitation);
              break;
            }
            case Invitation.State.AUTHENTICATING: {
              assert(invitation.invitationId);
              invitation.state = Invitation.State.AUTHENTICATING;
              next(invitation);
              break;
            }
            case Invitation.State.SUCCESS: {
              invitation.state = Invitation.State.SUCCESS;
              next(invitation);
              break;
            }
            case Invitation.State.CANCELLED: {
              assert(invitationId);
              invitation.invitationId = invitationId;
              invitation.state = Invitation.State.CANCELLED;
              next(invitation);
              break;
            }
            case Invitation.State.TIMEOUT: {
              assert(invitationId);
              invitation.invitationId = invitationId;
              invitation.state = Invitation.State.TIMEOUT;
              next(invitation);
              break;
            }
          }
        },
        (err: Error) => {
          close(err);
        },
        () => {
          close();
        }
      );

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

  async authenticate({ invitationId, authCode }: AuthenticationRequest): Promise<void> {
    log('authenticating...');
    assert(invitationId);
    const observable = this._acceptInvitations.get(invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId });
    } else {
      await observable.authenticate(authCode);
    }
  }

  async cancelInvitation({ invitationId }: { invitationId: string }): Promise<void> {
    log('cancelling...');
    assert(invitationId);
    const observable = this._createInvitations.get(invitationId) ?? this._acceptInvitations.get(invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId });
    } else {
      await observable?.cancel();
    }
  }
}
