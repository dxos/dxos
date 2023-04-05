//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import {
  AuthenticationRequest,
  Invitation,
  InvitationsService,
  QueryInvitationsResponse
} from '@dxos/protocols/proto/dxos/client/services';

import { InvitationProtocol } from './invitation-protocol';
import { InvitationsHandler } from './invitations-handler';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class InvitationsServiceImpl implements InvitationsService {
  private readonly _createInvitations = new Map<string, CancellableInvitationObservable>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitationObservable>();
  private readonly _invitationCreated = new Event<Invitation>();
  private readonly _invitationAccepted = new Event<Invitation>();
  private readonly _removedCreated = new Event<Invitation>();
  private readonly _removedAccepted = new Event<Invitation>();

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

  createInvitation(options: Invitation): Stream<Invitation> {
    let invitation: CancellableInvitationObservable;

    const existingInvitation = this._createInvitations.get(options.invitationId);
    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      const handler = this._getHandler(options);
      invitation = this._invitationsHandler.createInvitation(handler, options);
      this._createInvitations.set(invitation.get().invitationId, invitation);
      this._invitationCreated.emit(invitation.get());
    }

    return new Stream<Invitation>(({ next, close }) => {
      invitation.subscribe(
        (invitation) => {
          next(invitation);
        },
        (err: Error) => {
          close(err);
        },
        () => {
          close();
        }
      );
    });
  }

  acceptInvitation(options: Invitation): Stream<Invitation> {
    let invitation: AuthenticatingInvitationObservable;

    const existingInvitation = this._acceptInvitations.get(options.invitationId);
    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      const handler = this._getHandler(options);
      invitation = this._invitationsHandler.acceptInvitation(handler, options);
      this._acceptInvitations.set(invitation.get().invitationId, invitation);
      this._invitationAccepted.emit(invitation.get());
    }

    return new Stream<Invitation>(({ next, close }) => {
      invitation.subscribe(
        (invitation) => {
          next(invitation);
        },
        (err: Error) => {
          close(err);
        },
        () => {
          close();
        }
      );
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
      await observable.cancel();
    }
  }

  async deleteInvitation({ invitationId }: { invitationId: string }): Promise<void> {
    log('deleting...');
    assert(invitationId);
    const created = this._createInvitations.get(invitationId);
    const accepted = this._acceptInvitations.get(invitationId);
    if (created) {
      this._createInvitations.delete(invitationId);
      this._removedCreated.emit(created.get());
    } else if (accepted) {
      this._acceptInvitations.delete(invitationId);
      this._removedAccepted.emit(accepted.get());
    } else {
      log.warn('invalid invitation', { invitationId });
    }
  }

  queryInvitations(): Stream<QueryInvitationsResponse> {
    return new Stream<QueryInvitationsResponse>(({ next, ctx }) => {
      // Push added invitations to the stream.
      this._invitationCreated.on(ctx, (invitation) => {
        next({ added: { created: invitation } });
      });

      this._invitationAccepted.on(ctx, (invitation) => {
        next({ added: { accepted: invitation } });
      });

      // Push removed invitations to the stream.
      this._removedCreated.on(ctx, (invitation) => {
        next({ removed: { created: invitation } });
      });

      this._removedAccepted.on(ctx, (invitation) => {
        next({ removed: { accepted: invitation } });
      });

      // Push existing invitations to the stream.
      for (const invitation of this._createInvitations.values()) {
        next({ added: { created: invitation.get() } });
      }

      for (const invitation of this._acceptInvitations.values()) {
        next({ added: { accepted: invitation.get() } });
      }
    });
  }
}
