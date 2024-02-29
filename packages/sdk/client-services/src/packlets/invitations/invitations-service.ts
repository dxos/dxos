//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTask } from '@dxos/async';
import { type AuthenticatingInvitation, type CancellableInvitation } from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { type MetadataStore } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type AuthenticationRequest,
  type AcceptInvitationRequest,
  type GetPersistentInvitationsResponse,
  Invitation,
  type InvitationsService,
  QueryInvitationsResponse,
} from '@dxos/protocols/proto/dxos/client/services';

import { type InvitationProtocol } from './invitation-protocol';
import { invitationExpired, type InvitationsHandler } from './invitations-handler';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class InvitationsServiceImpl implements InvitationsService {
  private readonly _createInvitations = new Map<string, CancellableInvitation>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitation>();
  private readonly _invitationCreated = new Event<Invitation>();
  private readonly _invitationAccepted = new Event<Invitation>();
  private readonly _removedCreated = new Event<Invitation>();
  private readonly _removedAccepted = new Event<Invitation>();

  constructor(
    private readonly _invitationsHandler: InvitationsHandler,
    private readonly _getHandler: (invitation: Invitation) => InvitationProtocol,
    // TODO(nf): avoid making InvitationManager?
    private readonly _metadataStore: MetadataStore,
  ) {}

  // TODO(burdon): Guest/host label.
  getLoggingContext() {
    return {
      // deviceKey: this._identityManager.identity?.deviceKey
    };
  }

  createInvitation(options: Invitation): Stream<Invitation> {
    let invitation: CancellableInvitation;

    const savePersistentInvitationCtx = new Context();
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
      if (invitation.get().persistent) {
        scheduleTask(savePersistentInvitationCtx, async () =>
          this._metadataStore.addInvitation(invitation.get()).catch((err) => close(err)),
        );
      }
      invitation.subscribe(
        (invitation) => {
          next(invitation);
        },
        async (err: Error) => {
          await savePersistentInvitationCtx.dispose();
          close(err);
        },
        async () => {
          close();
          if (invitation.get().persistent) {
            await savePersistentInvitationCtx.dispose();
            await this._metadataStore.removeInvitation(invitation.get().invitationId);
          }

          this._createInvitations.delete(invitation.get().invitationId);
          if (invitation.get().type !== Invitation.Type.MULTIUSE) {
            this._removedCreated.emit(invitation.get());
          }
        },
      );
    });
  }

  async getPersistentInvitations(): Promise<GetPersistentInvitationsResponse> {
    const persistentInvitations = this._metadataStore.getInvitations();

    // get saved persistent invitations, filter and remove from storage those that have expired.
    const freshInvitations = persistentInvitations.filter(async (invitation) => !invitationExpired(invitation));

    return { invitations: freshInvitations };
  }

  acceptInvitation({ invitation: options, deviceProfile }: AcceptInvitationRequest): Stream<Invitation> {
    let invitation: AuthenticatingInvitation;

    // TODO(nf): duplicate check in InvitationHandler
    if (deviceProfile) {
      invariant(options.kind === Invitation.Kind.DEVICE, 'deviceProfile provided for non-device invitation');
    }

    const existingInvitation = this._acceptInvitations.get(options.invitationId);
    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      const handler = this._getHandler(options);
      invitation = this._invitationsHandler.acceptInvitation(handler, options, deviceProfile);
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
          this._acceptInvitations.delete(invitation.get().invitationId);
          if (invitation.get().type !== Invitation.Type.MULTIUSE) {
            this._removedAccepted.emit(invitation.get());
          }
        },
      );
    });
  }

  async authenticate({ invitationId, authCode }: AuthenticationRequest): Promise<void> {
    log('authenticating...');
    invariant(invitationId);
    const observable = this._acceptInvitations.get(invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId });
    } else {
      await observable.authenticate(authCode);
    }
  }

  async cancelInvitation({ invitationId }: { invitationId: string }): Promise<void> {
    log('deleting...');
    invariant(invitationId);
    const created = this._createInvitations.get(invitationId);
    const accepted = this._acceptInvitations.get(invitationId);
    if (created) {
      await created.cancel();
      this._createInvitations.delete(invitationId);
      this._removedCreated.emit(created.get());
      if (created.get().persistent) {
        await this._metadataStore.removeInvitation(created.get().invitationId);
      }
    } else if (accepted) {
      await accepted.cancel();
      this._acceptInvitations.delete(invitationId);
      this._removedAccepted.emit(accepted.get());
    }
  }

  queryInvitations(): Stream<QueryInvitationsResponse> {
    return new Stream<QueryInvitationsResponse>(({ next, ctx }) => {
      // Push added invitations to the stream.
      this._invitationCreated.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.ADDED,
          type: QueryInvitationsResponse.Type.CREATED,
          invitations: [invitation],
        });
      });

      this._invitationAccepted.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.ADDED,
          type: QueryInvitationsResponse.Type.ACCEPTED,
          invitations: [invitation],
        });
      });

      // Push removed invitations to the stream.
      this._removedCreated.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.REMOVED,
          type: QueryInvitationsResponse.Type.CREATED,
          invitations: [invitation],
        });
      });

      this._removedAccepted.on(ctx, (invitation) => {
        next({
          action: QueryInvitationsResponse.Action.REMOVED,
          type: QueryInvitationsResponse.Type.ACCEPTED,
          invitations: [invitation],
        });
      });

      // Push existing invitations to the stream.
      next({
        action: QueryInvitationsResponse.Action.ADDED,
        type: QueryInvitationsResponse.Type.CREATED,
        invitations: Array.from(this._createInvitations.values()).map((invitation) => invitation.get()),
      });

      next({
        action: QueryInvitationsResponse.Action.ADDED,
        type: QueryInvitationsResponse.Type.ACCEPTED,
        invitations: Array.from(this._acceptInvitations.values()).map((invitation) => invitation.get()),
      });

      // TODO(nf): expired invitations?
    });
  }
}
