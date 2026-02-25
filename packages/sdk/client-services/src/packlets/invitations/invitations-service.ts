//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type Halo } from '@dxos/protocols';
import { type Empty, EmptySchema, create } from '@dxos/protocols/buf';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type AcceptInvitationRequest,
  type AuthenticationRequest,
  type CancelInvitationRequest,
  type QueryInvitationsResponse,
  QueryInvitationsResponseSchema,
  QueryInvitationsResponse_Action,
  QueryInvitationsResponse_Type,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { trace } from '@dxos/tracing';

import { type InvitationsManager } from './invitations-manager';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class InvitationsServiceImpl implements Halo.InvitationsService {
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
        .then((invitation) => {
          trace.metrics.increment('dxos.invitation.created');
          invitation.subscribe((inv) => next(inv), close, close);
        })
        .catch(close);
    });
  }

  acceptInvitation(request: AcceptInvitationRequest): Stream<Invitation> {
    const invitation = this._invitationsManager.acceptInvitation(request);
    return new Stream<Invitation>(({ next, close }) => {
      invitation.subscribe((inv) => next(inv), close, close);
    });
  }

  async authenticate(request: AuthenticationRequest): Promise<Empty> {
    await this._invitationsManager.authenticate(request);
    return create(EmptySchema);
  }

  async cancelInvitation(request: CancelInvitationRequest): Promise<Empty> {
    await this._invitationsManager.cancelInvitation(request);
    return create(EmptySchema);
  }

  queryInvitations(): Stream<QueryInvitationsResponse> {
    return new Stream<QueryInvitationsResponse>(({ next, ctx }) => {
      // Push added invitations to the stream.
      this._invitationsManager.invitationCreated.on(ctx, (invitation) => {
        next(
          create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.ADDED,
            type: QueryInvitationsResponse_Type.CREATED,
            invitations: [invitation],
          }),
        );
      });

      this._invitationsManager.invitationAccepted.on(ctx, (invitation) => {
        next(
          create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.ADDED,
            type: QueryInvitationsResponse_Type.ACCEPTED,
            invitations: [invitation],
          }),
        );
      });

      // Push removed invitations to the stream.
      this._invitationsManager.removedCreated.on(ctx, (invitation) => {
        next(
          create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.REMOVED,
            type: QueryInvitationsResponse_Type.CREATED,
            invitations: [invitation],
          }),
        );
      });

      this._invitationsManager.removedAccepted.on(ctx, (invitation) => {
        next(
          create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.REMOVED,
            type: QueryInvitationsResponse_Type.ACCEPTED,
            invitations: [invitation],
          }),
        );
      });

      // used only for testing
      this._invitationsManager.saved.on(ctx, (invitation) => {
        next(
          create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.SAVED,
            type: QueryInvitationsResponse_Type.CREATED,
            invitations: [invitation],
          }),
        );
      });

      // Push existing invitations to the stream.
      next(
        create(QueryInvitationsResponseSchema, {
          action: QueryInvitationsResponse_Action.ADDED,
          type: QueryInvitationsResponse_Type.CREATED,
          invitations: this._invitationsManager.getCreatedInvitations(),
          existing: true,
        }),
      );

      next(
        create(QueryInvitationsResponseSchema, {
          action: QueryInvitationsResponse_Action.ADDED,
          type: QueryInvitationsResponse_Type.ACCEPTED,
          invitations: this._invitationsManager.getAcceptedInvitations(),
          existing: true,
        }),
      );

      this._invitationsManager.onPersistentInvitationsLoaded(ctx, () => {
        next(
          create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.LOAD_COMPLETE,
            type: QueryInvitationsResponse_Type.CREATED,
            // TODO(nf): populate with invitations
          }),
        );
      });
      // TODO(nf): expired invitations?
    });
  }
}
