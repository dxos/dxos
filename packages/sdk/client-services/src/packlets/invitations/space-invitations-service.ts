//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, TimeoutError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { SpaceManager } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { AuthenticateRequest, Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import { IdentityManager } from '../identity';
import { SpaceInvitationsHandler } from './space-invitations-handler';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsServiceImpl implements InvitationsService {
  private readonly _createInvitations = new Map<string, CancellableObservable<any>>();
  private readonly _acceptInvitations = new Map<string, CancellableObservable<any>>();

  // prettier-ignore
  constructor (
    // TODO(burdon): Replace with getters.
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _spaceInvitations: SpaceInvitationsHandler
  ) {}

  createInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      assert(invitation.spaceKey);
      log('host stream opened', {
        identityKey: this._identityManager.identity?.identityKey,
        spaceKey: invitation.spaceKey
      });
      const space = this._spaceManager.spaces.get(invitation.spaceKey!);
      assert(space);

      let invitationId: string;
      const observable = this._spaceInvitations.createInvitation(space);
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
        log('host stream closed', {
          identityKey: this._identityManager.identity?.identityKey,
          spaceKey: invitation.spaceKey,
          err
        });
        this._createInvitations.delete(invitation.invitationId!);
      };
    });
  }

  acceptInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      assert(invitation.spaceKey);
      log('guest stream opened', {
        identityKey: this._identityManager.identity?.identityKey,
        spaceKey: invitation.spaceKey
      });

      let invitationId: string;
      const observable = this._spaceInvitations.acceptInvitation(invitation);
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
        log('guest stream closed', {
          identityKey: this._identityManager.identity?.identityKey,
          spaceKey: invitation.spaceKey,
          err
        });
        this._acceptInvitations.delete(invitation.invitationId!);
      };
    });
  }

  async cancelInvitation(invitation: Invitation): Promise<void> {
    log('cancelling...');
    assert(invitation.invitationId);
    const observable =
      this._createInvitations.get(invitation.invitationId) ?? this._acceptInvitations.get(invitation.invitationId);
    await observable?.cancel();
  }

  async authenticate(request: AuthenticateRequest): Promise<Invitation> {
    throw new Error();
  }
}
