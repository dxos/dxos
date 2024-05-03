//
// Copyright 2024 DXOS.org
//

import { Event, PushStream } from '@dxos/async';
import {
  type AuthenticatingInvitation,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitation,
  INVITATION_TIMEOUT,
} from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import { hasInvitationExpired, type MetadataStore } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type AcceptInvitationRequest,
  type AuthenticationRequest,
  Invitation,
} from '@dxos/protocols/proto/dxos/client/services';

import type { InvitationProtocol } from './invitation-protocol';
import { createAdmissionKeypair, type InvitationsHandler } from './invitations-handler';

/**
 * Entry point for creating and accepting invitations, keeps track of existing invitation set and
 * emits events when the set changes.
 */
export class InvitationsManager {
  private readonly _createInvitations = new Map<string, CancellableInvitation>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitation>();

  public readonly invitationCreated = new Event<Invitation>();
  public readonly invitationAccepted = new Event<Invitation>();
  public readonly removedCreated = new Event<Invitation>();
  public readonly removedAccepted = new Event<Invitation>();
  public readonly saved = new Event<Invitation>();

  private readonly _persistentInvitationsLoadedEvent = new Event();
  private _persistentInvitationsLoaded = false;

  constructor(
    private readonly _invitationsHandler: InvitationsHandler,
    private readonly _getHandler: (invitation: Partial<Invitation> & Pick<Invitation, 'kind'>) => InvitationProtocol,
    private readonly _metadataStore: MetadataStore,
  ) {}

  async createInvitation(options: Partial<Invitation> & Pick<Invitation, 'kind'>): Promise<CancellableInvitation> {
    if (options.invitationId) {
      const existingInvitation = this._createInvitations.get(options.invitationId);
      if (existingInvitation) {
        return existingInvitation;
      }
    }

    const handler = this._getHandler(options);
    const invitation = this._createInvitation(handler, options);
    const { ctx, stream, observableInvitation } = this._createObservableInvitation(handler, invitation);

    this._createInvitations.set(invitation.invitationId, observableInvitation);
    this.invitationCreated.emit(invitation);
    // onComplete is called on cancel, expiration, or redemption of a single-use invitation
    this._onInvitationComplete(observableInvitation, async () => {
      this._createInvitations.delete(observableInvitation.get().invitationId);
      this.removedCreated.emit(observableInvitation.get());
      if (observableInvitation.get().persistent) {
        await this._safeDeleteInvitation(observableInvitation.get());
      }
    });

    try {
      await this._persistIfRequired(handler, stream, invitation);
    } catch (err) {
      log.catch(err);
      await observableInvitation.cancel();
      return observableInvitation;
    }

    this._invitationsHandler.handleInvitationFlow(ctx, stream, handler, observableInvitation.get());

    return observableInvitation;
  }

  async loadPersistentInvitations(): Promise<{ invitations: Invitation[] }> {
    if (this._persistentInvitationsLoaded) {
      const invitations = this.getCreatedInvitations().filter((i) => i.persistent);
      return { invitations };
    }
    try {
      const persistentInvitations = this._metadataStore.getInvitations();
      // get saved persistent invitations, filter and remove from storage those that have expired.
      const freshInvitations = persistentInvitations.filter((invitation) => !hasInvitationExpired(invitation));

      const loadTasks = freshInvitations.map((persistentInvitation) => {
        invariant(!this._createInvitations.get(persistentInvitation.invitationId), 'invitation already exists');
        return this.createInvitation({ ...persistentInvitation, persistent: false });
      });
      const cInvitations = await Promise.all(loadTasks);

      return { invitations: cInvitations.map((invitation) => invitation.get()) };
    } catch (err) {
      log.catch(err);
      return { invitations: [] };
    } finally {
      this._persistentInvitationsLoadedEvent.emit();
      this._persistentInvitationsLoaded = true;
    }
  }

  acceptInvitation(request: AcceptInvitationRequest): AuthenticatingInvitation {
    const options = request.invitation;
    const existingInvitation = this._acceptInvitations.get(options.invitationId);
    if (existingInvitation) {
      return existingInvitation;
    }

    const handler = this._getHandler(options);
    const invitation = this._invitationsHandler.acceptInvitation(handler, options, request.deviceProfile);
    this._acceptInvitations.set(invitation.get().invitationId, invitation);
    this.invitationAccepted.emit(invitation.get());

    this._onInvitationComplete(invitation, () => {
      this._acceptInvitations.delete(invitation.get().invitationId);
      this.removedAccepted.emit(invitation.get());
    });

    return invitation;
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
    log('cancelInvitation...', { invitationId });
    invariant(invitationId);
    const created = this._createInvitations.get(invitationId);
    if (created) {
      // remove from storage before modifying in-memory state, higher chance of failing
      if (created.get().persistent) {
        await this._metadataStore.removeInvitation(invitationId);
      }
      await created.cancel();
      this._createInvitations.delete(invitationId);
      this.removedCreated.emit(created.get());
      return;
    }

    const accepted = this._acceptInvitations.get(invitationId);
    if (accepted) {
      await accepted.cancel();
      this._acceptInvitations.delete(invitationId);
      this.removedAccepted.emit(accepted.get());
    }
  }

  getCreatedInvitations(): Invitation[] {
    return [...this._createInvitations.values()].map((i) => i.get());
  }

  getAcceptedInvitations(): Invitation[] {
    return [...this._acceptInvitations.values()].map((i) => i.get());
  }

  onPersistentInvitationsLoaded(ctx: Context, callback: () => void) {
    if (this._persistentInvitationsLoaded) {
      callback();
    } else {
      this._persistentInvitationsLoadedEvent.once(ctx, () => callback());
    }
  }

  private _createInvitation(protocol: InvitationProtocol, options?: Partial<Invitation>): Invitation {
    const {
      invitationId = PublicKey.random().toHex(),
      type = Invitation.Type.INTERACTIVE,
      authMethod = Invitation.AuthMethod.SHARED_SECRET,
      state = Invitation.State.INIT,
      timeout = INVITATION_TIMEOUT,
      swarmKey = PublicKey.random(),
      persistent = options?.authMethod !== Invitation.AuthMethod.KNOWN_PUBLIC_KEY, // default no not storing keypairs
      created = new Date(),
      guestKeypair = undefined,
      lifetime = 86400, // 1 day,
      multiUse = false,
    } = options ?? {};
    const authCode =
      options?.authCode ??
      (authMethod === Invitation.AuthMethod.SHARED_SECRET ? generatePasscode(AUTHENTICATION_CODE_LENGTH) : undefined);

    return {
      invitationId,
      type,
      authMethod,
      state,
      swarmKey,
      authCode,
      timeout,
      persistent: persistent && type !== Invitation.Type.DELEGATED, // delegated invitations are persisted in control feed
      guestKeypair:
        guestKeypair ?? (authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY ? createAdmissionKeypair() : undefined),
      created,
      lifetime,
      multiUse,
      delegationCredentialId: options?.delegationCredentialId,
      ...protocol.getInvitationContext(),
    } satisfies Invitation;
  }

  private _createObservableInvitation(handler: InvitationProtocol, invitation: Invitation) {
    const stream = new PushStream<Invitation>();
    const ctx = new Context({
      onError: (err) => {
        stream.error(err);
        void ctx.dispose();
      },
    });
    ctx.onDispose(() => {
      log('complete', { ...handler.toJSON() });
      stream.complete();
    });
    const observableInvitation = new CancellableInvitation({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...invitation, state: Invitation.State.CANCELLED });
        await ctx.dispose();
      },
    });
    return { ctx, stream, observableInvitation };
  }

  private async _persistIfRequired(
    handler: InvitationProtocol,
    changeStream: PushStream<Invitation>,
    invitation: Invitation,
  ): Promise<void> {
    if (invitation.type === Invitation.Type.DELEGATED && invitation.delegationCredentialId == null) {
      const delegationCredentialId = await handler.delegate(invitation);
      changeStream.next({ ...invitation, delegationCredentialId });
    } else if (invitation.persistent) {
      await this._metadataStore.addInvitation(invitation);
      this.saved.emit(invitation);
    }
  }

  private async _safeDeleteInvitation(invitation: Invitation): Promise<void> {
    try {
      await this._metadataStore.removeInvitation(invitation.invitationId);
    } catch (err) {
      log.catch(err);
    }
  }

  private _onInvitationComplete(invitation: CancellableInvitation, callback: () => void) {
    invitation.subscribe(
      () => {},
      () => {},
      callback,
    );
  }
}
