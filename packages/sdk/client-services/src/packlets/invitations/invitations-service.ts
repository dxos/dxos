//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import {
  type AuthenticationRequest,
  type AcceptInvitationRequest,
  type Invitation,
  type InvitationsService,
  QueryInvitationsResponse,
} from '@dxos/protocols/proto/dxos/client/services';

import { type InvitationsManager } from './invitations-manager';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class InvitationsServiceImpl implements InvitationsService {
  constructor(private readonly _invitationsManager: InvitationsManager) {}

  // TODO(burdon): Guest/host label.
  getLoggingContext() {
    return {
      // deviceKey: this._identityManager.identity?.deviceKey
    };
  }

  createInvitation(options: Invitation): Stream<Invitation> {
    return new Stream<Invitation>(({ next, close }) => {
      void this._invitationsManager
        .createInvitation(options)
        .then((invitation) => invitation.subscribe(next, close, close))
        .catch(close);
    });
  }

  acceptInvitation(request: AcceptInvitationRequest): Stream<Invitation> {
    const invitation = this._invitationsManager.acceptInvitation(request);
    return new Stream<Invitation>(({ next, close }) => {
      invitation.subscribe(next, close, close);
    });
  }

  async authenticate(request: AuthenticationRequest): Promise<void> {
    return this._invitationsManager.authenticate(request);
  }

  async cancelInvitation(request: { invitationId: string }): Promise<void> {
    return this._invitationsManager.cancelInvitation(request);
  }

  queryInvitations(): Stream<QueryInvitationsResponse> {
    return new Stream<QueryInvitationsResponse>(({ next, ctx }) => {
      // Push added invitations to the stream.
      this._invitationsManager.invitationCreated.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.ADDED,
          type: QueryInvitationsResponse.Type.CREATED,
          invitations: [invitation],
        });
      });

      this._invitationsManager.invitationAccepted.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.ADDED,
          type: QueryInvitationsResponse.Type.ACCEPTED,
          invitations: [invitation],
        });
      });

      // Push removed invitations to the stream.
      this._invitationsManager.removedCreated.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.REMOVED,
          type: QueryInvitationsResponse.Type.CREATED,
          invitations: [invitation],
        });
      });

      this._invitationsManager.removedAccepted.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.REMOVED,
          type: QueryInvitationsResponse.Type.ACCEPTED,
          invitations: [invitation],
        });
      });

      // used only for testing
      this._invitationsManager.saved.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.SAVED,
          type: QueryInvitationsResponse.Type.CREATED,
          invitations: [invitation],
        });
      });

      // Push existing invitations to the stream.
      next({
        action: QueryInvitationsResponse.Action.ADDED,
        type: QueryInvitationsResponse.Type.CREATED,
        invitations: this._invitationsManager.getCreatedInvitations(),
        existing: true,
      });

      next({
        action: QueryInvitationsResponse.Action.ADDED,
        type: QueryInvitationsResponse.Type.ACCEPTED,
        invitations: this._invitationsManager.getAcceptedInvitations(),
        existing: true,
      });

      this._invitationsManager.onPersistentInvitationsLoaded(ctx, () => {
        next({
          action: QueryInvitationsResponse.Action.LOAD_COMPLETE,
          type: QueryInvitationsResponse.Type.CREATED,
          // TODO(nf): populate with invitations
        });
      });
      // TODO(nf): expired invitations?
    });
  }
}
