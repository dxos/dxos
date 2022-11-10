//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { TimeoutError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { SpaceManager } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { AuthenticationRequest, Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { Provider } from '@dxos/util';

import { IdentityManager } from '../identity';
import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from './invitations';
import { SpaceInvitationsHandler } from './space-invitations-handler';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsServiceImpl implements InvitationsService {
  private readonly _createInvitations = new Map<string, CancellableInvitationObservable>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitationObservable>();

  // prettier-ignore
  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _getSpaceManager: Provider<SpaceManager>,
    private readonly _getSpaceInvitations: Provider<SpaceInvitationsHandler>
  ) {}

  createInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      const spaceManager = this._getSpaceManager();
      const spaceInvitations = this._getSpaceInvitations();

      assert(invitation.spaceKey);
      log('stream opened', {
        host: this._identityManager.identity?.deviceKey,
        spaceKey: invitation.spaceKey
      });
      const space = spaceManager.spaces.get(invitation.spaceKey!);
      assert(space);

      let invitationId: string;
      const { type } = invitation;
      const observable = spaceInvitations.createInvitation(space, { type });
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
        const context = {
          guest: this._identityManager.identity?.deviceKey,
          spaceKey: invitation.spaceKey
        };
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
      const spaceInvitations = this._getSpaceInvitations();

      assert(invitation.spaceKey);
      log('stream opened', {
        guest: this._identityManager.identity?.deviceKey,
        spaceKey: invitation.spaceKey
      });

      let invitationId: string;
      const observable = spaceInvitations.acceptInvitation(invitation);
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
          assert(invitation.spaceKey);
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
        const context = {
          guest: this._identityManager.identity?.deviceKey,
          spaceKey: invitation.spaceKey
        };
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
