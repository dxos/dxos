//
// Copyright 2024 DXOS.org
//

import { Event, PushStream, TimeoutError, Trigger } from '@dxos/async';
import {
  AUTHENTICATION_CODE_LENGTH,
  AuthenticatingInvitation,
  CancellableInvitation,
  INVITATION_TIMEOUT,
} from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import { type MetadataStore, hasInvitationExpired } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type AcceptInvitationRequest,
  type AuthenticationRequest,
  Invitation,
} from '@dxos/protocols/proto/dxos/client/services';
import { SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { trace } from '@dxos/tracing';

import type { InvitationProtocol } from './invitation-protocol';
import { type InvitationsHandler, createAdmissionKeypair } from './invitations-handler';

/**
 * Entry point for creating and accepting invitations, keeps track of existing invitation set and
 * emits events when the set changes.
 */
@trace.resource()
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

  @trace.span({ showInBrowserTimeline: true })
  async createInvitation(
    ctx: Context,
    options: Partial<Invitation> & Pick<Invitation, 'kind'>,
  ): Promise<CancellableInvitation> {
    if (options.invitationId) {
      const existingInvitation = this._createInvitations.get(options.invitationId);
      if (existingInvitation) {
        return existingInvitation;
      }
    }

    const handler = this._getHandler(options);
    const invitationError = handler.checkCanInviteNewMembers(ctx);
    if (invitationError != null) {
      throw invitationError;
    }
    const invitation = this._createInvitation(ctx, handler, options);

    const {
      ctx: invitationCtx,
      stream,
      observableInvitation,
    } = this._createObservableInvitation(ctx, handler, invitation);

    this._createInvitations.set(invitation.invitationId, observableInvitation);
    this.invitationCreated.emit(invitation);
    this._onInvitationComplete(ctx, observableInvitation, async () => {
      this._createInvitations.delete(observableInvitation.get().invitationId);
      this.removedCreated.emit(observableInvitation.get());
      if (observableInvitation.get().persistent) {
        await this._safeDeleteInvitation(ctx, observableInvitation.get());
      }
    });

    try {
      await this._persistIfRequired(ctx, handler, stream, invitation);
    } catch (err) {
      log.catch(err);
      await observableInvitation.cancel();
      return observableInvitation;
    }

    this._invitationsHandler.handleInvitationFlow(invitationCtx, stream, handler, observableInvitation.get());

    return observableInvitation;
  }

  async loadPersistentInvitations(ctx: Context): Promise<{ invitations: Invitation[] }> {
    if (this._persistentInvitationsLoaded) {
      const invitations = this.getCreatedInvitations(ctx).filter((i) => i.persistent);
      return { invitations };
    }
    try {
      const persistentInvitations = this._metadataStore.getInvitations();
      const freshInvitations = persistentInvitations.filter((invitation) => !hasInvitationExpired(invitation));

      const loadTasks = freshInvitations.map((persistentInvitation) => {
        invariant(!this._createInvitations.get(persistentInvitation.invitationId), 'invitation already exists');
        return this.createInvitation(ctx, { ...persistentInvitation, persistent: false });
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

  acceptInvitation(ctx: Context, request: AcceptInvitationRequest): AuthenticatingInvitation {
    const options = request.invitation;
    const existingInvitation = this._acceptInvitations.get(options.invitationId);
    if (existingInvitation) {
      return existingInvitation;
    }

    const handler = this._getHandler(options);
    const {
      ctx: invitationCtx,
      invitation,
      stream,
      otpEnteredTrigger,
    } = this._createObservableAcceptingInvitation(ctx, handler, options);
    this._invitationsHandler.acceptInvitation(
      invitationCtx,
      stream,
      handler,
      options,
      otpEnteredTrigger,
      request.deviceProfile,
    );
    this._acceptInvitations.set(invitation.get().invitationId, invitation);
    this.invitationAccepted.emit(invitation.get());

    this._onInvitationComplete(ctx, invitation, () => {
      this._acceptInvitations.delete(invitation.get().invitationId);
      this.removedAccepted.emit(invitation.get());
    });

    return invitation;
  }

  async authenticate(ctx: Context, { invitationId, authCode }: AuthenticationRequest): Promise<void> {
    log('authenticating...');
    invariant(invitationId);
    const observable = this._acceptInvitations.get(invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId });
    } else {
      await observable.authenticate(authCode);
    }
  }

  async cancelInvitation(ctx: Context, { invitationId }: { invitationId: string }): Promise<void> {
    log('cancelInvitation...', { invitationId });
    invariant(invitationId);
    const created = this._createInvitations.get(invitationId);
    if (created) {
      if (created.get().persistent) {
        await this._metadataStore.removeInvitation(invitationId);
      }
      if (created.get().type === Invitation.Type.DELEGATED) {
        const handler = this._getHandler(created.get());
        await handler.cancelDelegation(ctx, created.get());
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

  getCreatedInvitations(ctx: Context): Invitation[] {
    return [...this._createInvitations.values()].map((i) => i.get());
  }

  getAcceptedInvitations(ctx: Context): Invitation[] {
    return [...this._acceptInvitations.values()].map((i) => i.get());
  }

  onPersistentInvitationsLoaded(ctx: Context, callback: () => void): void {
    if (this._persistentInvitationsLoaded) {
      callback();
    } else {
      this._persistentInvitationsLoadedEvent.once(ctx, () => callback());
    }
  }

  private _createInvitation(ctx: Context, protocol: InvitationProtocol, _options?: Partial<Invitation>): Invitation {
    const {
      invitationId = PublicKey.random().toHex(),
      type = Invitation.Type.INTERACTIVE,
      authMethod = Invitation.AuthMethod.SHARED_SECRET,
      state = Invitation.State.INIT,
      timeout = INVITATION_TIMEOUT,
      swarmKey = PublicKey.random(),
      persistent = _options?.authMethod !== Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
      created = new Date(),
      guestKeypair = undefined,
      role = SpaceMember.Role.ADMIN,
      lifetime = 86400 * 7, // 7 days,
      multiUse = false,
      ...options
    } = _options ?? {};
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
      persistent: persistent && type !== Invitation.Type.DELEGATED,
      guestKeypair:
        guestKeypair ?? (authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY ? createAdmissionKeypair() : undefined),
      created,
      lifetime,
      role,
      multiUse,
      delegationCredentialId: options?.delegationCredentialId,
      ...options,
      ...protocol.getInvitationContext(ctx),
    } satisfies Invitation;
  }

  private _createObservableInvitation(
    ctx: Context,
    handler: InvitationProtocol,
    invitation: Invitation,
  ): { ctx: Context; stream: PushStream<Invitation>; observableInvitation: CancellableInvitation } {
    const stream = new PushStream<Invitation>();
    const invitationCtx = new Context({
      onError: (err) => {
        stream.error(err);
        void invitationCtx.dispose();
      },
    });
    invitationCtx.onDispose(() => {
      log('complete', { ...handler.toJSON() });
      stream.complete();
    });
    const observableInvitation = new CancellableInvitation({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...invitation, state: Invitation.State.CANCELLED });
        await invitationCtx.dispose();
      },
    });
    return { ctx: invitationCtx, stream, observableInvitation };
  }

  private _createObservableAcceptingInvitation(
    ctx: Context,
    handler: InvitationProtocol,
    initialState: Invitation,
  ): {
    ctx: Context;
    invitation: AuthenticatingInvitation;
    stream: PushStream<Invitation>;
    otpEnteredTrigger: Trigger<string>;
  } {
    const otpEnteredTrigger = new Trigger<string>();
    const stream = new PushStream<Invitation>();
    const invitationCtx = new Context({
      onError: (err) => {
        if (err instanceof TimeoutError) {
          log('timeout', { ...handler.toJSON() });
          stream.next({ ...initialState, state: Invitation.State.TIMEOUT });
        } else {
          log.warn('auth failed', err);
          stream.next({ ...initialState, state: Invitation.State.ERROR });
        }
        void invitationCtx.dispose();
      },
    });
    invitationCtx.onDispose(() => {
      log('complete', { ...handler.toJSON() });
      stream.complete();
    });
    const invitation = new AuthenticatingInvitation({
      initialInvitation: initialState,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...initialState, state: Invitation.State.CANCELLED });
        await invitationCtx.dispose();
      },
      onAuthenticate: async (code: string) => {
        otpEnteredTrigger.wake(code);
      },
    });
    return { ctx: invitationCtx, invitation, stream, otpEnteredTrigger };
  }

  private async _persistIfRequired(
    ctx: Context,
    handler: InvitationProtocol,
    changeStream: PushStream<Invitation>,
    invitation: Invitation,
  ): Promise<void> {
    if (invitation.type === Invitation.Type.DELEGATED && invitation.delegationCredentialId == null) {
      const delegationCredentialId = await handler.delegate(ctx, invitation);
      changeStream.next({ ...invitation, delegationCredentialId });
    } else if (invitation.persistent) {
      await this._metadataStore.addInvitation(invitation);
      this.saved.emit(invitation);
    }
  }

  private async _safeDeleteInvitation(ctx: Context, invitation: Invitation): Promise<void> {
    try {
      await this._metadataStore.removeInvitation(invitation.invitationId);
    } catch (err) {
      log.catch(err);
    }
  }

  private _onInvitationComplete(ctx: Context, invitation: CancellableInvitation, callback: () => void): void {
    invitation.subscribe(
      () => {},
      () => {},
      callback,
    );
  }
}
