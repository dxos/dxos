//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { buf } from '@dxos/protocols/buf';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  QueryInvitationsResponse,
  QueryInvitationsResponseSchema,
  QueryInvitationsResponse_Action,
  QueryInvitationsResponse_Type,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type InvitationsService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';

import { type InvitationsManager } from './invitations-manager';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class InvitationsServiceImpl implements InvitationsService.Handlers {
  'constructor'(private readonly _invitationsManager: InvitationsManager) {}

  // TODO(burdon): Guest/host label.
  'getLoggingContext'() {
    return {
      // deviceKey: this._identityManager.identity?.deviceKey
    };
  }

  ['InvitationsService.createInvitation'](request: Invitation): EffectStream.Stream<Invitation, Error> {
    return EffectEx.streamFromEmitter<Invitation, Error>((emit) => {
      const ctx = Context.default();
      void this._invitationsManager
        .createInvitation(ctx, request)
        .then((invitation) => {
          trace.metrics.increment('dxos.invitation.created');
          invitation.subscribe(
            (value) => void emit.single(value),
            (err) => void emit.fail(err),
            () => void emit.end(),
          );
        })
        .catch((err) => void emit.fail(err));
      return Effect.promise(() => ctx.dispose());
    });
  }

  ['InvitationsService.acceptInvitation'](
    request: InvitationsService.AcceptInvitationRequest,
  ): EffectStream.Stream<Invitation, Error> {
    return EffectEx.streamFromEmitter<Invitation, Error>((emit) => {
      const ctx = Context.default();
      const invitation = this._invitationsManager.acceptInvitation(ctx, request);
      invitation.subscribe(
        (value) => void emit.single(value),
        (err) => void emit.fail(err),
        () => void emit.end(),
      );
      return Effect.promise(() => ctx.dispose());
    });
  }

  ['InvitationsService.authenticate'](request: InvitationsService.AuthenticationRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: () => this._invitationsManager.authenticate(request),
      catch: (error) => error as Error,
    });
  }

  ['InvitationsService.cancelInvitation'](
    request: InvitationsService.CancelInvitationRequest,
  ): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: () => this._invitationsManager.cancelInvitation(request),
      catch: (error) => error as Error,
    });
  }

  ['InvitationsService.queryInvitations'](): EffectStream.Stream<QueryInvitationsResponse, Error> {
    return EffectEx.streamFromEmitter<QueryInvitationsResponse, Error>((emit) => {
      const ctx = Context.default();

      // Push added invitations to the stream.
      this._invitationsManager.invitationCreated.on(ctx, (invitation) => {
        void emit.single(
          buf.create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.ADDED,
            type: QueryInvitationsResponse_Type.CREATED,
            invitations: [invitation],
          }),
        );
      });

      this._invitationsManager.invitationAccepted.on(ctx, (invitation) => {
        void emit.single(
          buf.create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.ADDED,
            type: QueryInvitationsResponse_Type.ACCEPTED,
            invitations: [invitation],
          }),
        );
      });

      // Push removed invitations to the stream.
      this._invitationsManager.removedCreated.on(ctx, (invitation) => {
        void emit.single(
          buf.create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.REMOVED,
            type: QueryInvitationsResponse_Type.CREATED,
            invitations: [invitation],
          }),
        );
      });

      this._invitationsManager.removedAccepted.on(ctx, (invitation) => {
        void emit.single(
          buf.create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.REMOVED,
            type: QueryInvitationsResponse_Type.ACCEPTED,
            invitations: [invitation],
          }),
        );
      });

      // used only for testing
      this._invitationsManager.saved.on(ctx, (invitation) => {
        void emit.single(
          buf.create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.SAVED,
            type: QueryInvitationsResponse_Type.CREATED,
            invitations: [invitation],
          }),
        );
      });

      // Push existing invitations to the stream.
      void emit.single(
        buf.create(QueryInvitationsResponseSchema, {
          action: QueryInvitationsResponse_Action.ADDED,
          type: QueryInvitationsResponse_Type.CREATED,
          invitations: this._invitationsManager.getCreatedInvitations(),
          existing: true,
        }),
      );

      void emit.single(
        buf.create(QueryInvitationsResponseSchema, {
          action: QueryInvitationsResponse_Action.ADDED,
          type: QueryInvitationsResponse_Type.ACCEPTED,
          invitations: this._invitationsManager.getAcceptedInvitations(),
          existing: true,
        }),
      );

      this._invitationsManager.onPersistentInvitationsLoaded(ctx, () => {
        void emit.single(
          buf.create(QueryInvitationsResponseSchema, {
            action: QueryInvitationsResponse_Action.LOAD_COMPLETE,
            type: QueryInvitationsResponse_Type.CREATED,
            // TODO(nf): populate with invitations
          }),
        );
      });
      // TODO(nf): expired invitations?

      return Effect.promise(() => ctx.dispose());
    });
  }
}
