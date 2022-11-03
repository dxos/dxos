//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, TimeoutError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { SpaceManager } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { AuthenticateRequest, Invitation, InvitationService } from '@dxos/protocols/proto/dxos/client/services';

import { SpaceInvitations } from './space-invitations';

/**
 * Spaces invitations service.
 */
export class SpaceInvitationServiceImpl implements InvitationService {
  private readonly _connectionStreams = new Map<string, CancellableObservable<any>>();

  // prettier-ignore
  constructor (
    private readonly _spaceManager: SpaceManager,
    private readonly _spaceInvitations: SpaceInvitations
  ) {}

  createInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      assert(invitation.spaceKey);
      log('stream opened', { spaceKey: invitation.spaceKey });
      const space = this._spaceManager.spaces.get(invitation.spaceKey!);
      assert(space);

      let invitationId: string;
      const observable = this._spaceInvitations.createInvitation(space);
      observable.subscribe({
        onConnecting: (invitation) => {
          assert(invitation.invitationId);
          invitationId = invitation.invitationId;
          this._connectionStreams.set(invitation.invitationId, observable);
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

      return () => {
        log('stream closed', { spaceKey: invitation.spaceKey });
        void observable.cancel();
        this._connectionStreams.delete(invitation.invitationId!);
      };
    });
  }

  async cancelInvitation(invitation: Invitation): Promise<void> {
    log('cancelling...');
    assert(invitation.invitationId);
    const observable = this._connectionStreams.get(invitation.invitationId!);
    await observable?.cancel();
  }

  acceptInvitation(invitation: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next }) => {});
  }

  async authenticate(request: AuthenticateRequest): Promise<Invitation> {
    throw new Error();
  }
}
