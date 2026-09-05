//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, PushStream, TimeoutError, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitation,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitation,
  INVITATION_TIMEOUT,
} from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf, bufInit, bufWkt, fromPublicKey } from '@dxos/protocols/buf';
import {
  Invitation,
  Invitation_AuthMethod,
  Invitation_State,
  Invitation_Type,
  InvitationSchema,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type InvitationsService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';

import { type IMetadataStore, IMetadataStoreService, hasInvitationExpired } from '../metadata';
import type { InvitationProtocol } from './invitation-protocol';
import { type InvitationsHandler, InvitationsHandlerService, createAdmissionKeypair } from './invitations-handler';
import { fromBufInvitation, toBufInvitation } from './utils';

/**
 * Effect service tag for {@link InvitationsManager}.
 */
export class InvitationsManagerService extends EffectContext.Service<InvitationsManagerService, InvitationsManager>()(
  '@dxos/client-services/InvitationsManager',
) {}

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

  private _invitationHandlerFactory?: (
    invitation: Partial<Invitation> & Pick<Invitation, 'kind'>,
  ) => InvitationProtocol;

  constructor(
    private readonly _invitationsHandler: InvitationsHandler,
    private readonly _metadataStore: IMetadataStore,
  ) {}

  /**
   * Wires the invitation handler factory after the composing stack is fully constructed.
   */
  setInvitationHandlerFactory(
    getHandler: (invitation: Partial<Invitation> & Pick<Invitation, 'kind'>) => InvitationProtocol,
  ): void {
    this._invitationHandlerFactory = getHandler;
  }

  private _getHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol {
    invariant(this._invitationHandlerFactory, 'Invitation handler factory not set.');
    return this._invitationHandlerFactory(invitation);
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
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
    const invitationError = handler.checkCanInviteNewMembers();
    if (invitationError != null) {
      throw invitationError;
    }
    const invitation = this._createInvitation(handler, options);

    const {
      ctx: invitationCtx,
      stream,
      observableInvitation,
    } = this._createObservableInvitation(ctx, handler, invitation);

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

    this._invitationsHandler.handleInvitationFlow(invitationCtx, stream, handler, observableInvitation.get());

    return observableInvitation;
  }

  async loadPersistentInvitations(ctx: Context): Promise<{ invitations: Invitation[] }> {
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
        return this.createInvitation(ctx, { ...toBufInvitation(persistentInvitation), persistent: false });
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

  acceptInvitation(ctx: Context, request: InvitationsService.AcceptInvitationRequest): AuthenticatingInvitation {
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

    this._onInvitationComplete(invitation, () => {
      this._acceptInvitations.delete(invitation.get().invitationId);
      this.removedAccepted.emit(invitation.get());
    });

    return invitation;
  }

  async authenticate({ invitationId, authCode }: InvitationsService.AuthenticationRequest): Promise<void> {
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
      if (created.get().type === Invitation_Type.DELEGATED) {
        const handler = this._getHandler(created.get());
        await handler.cancelDelegation(created.get());
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

  onPersistentInvitationsLoaded(ctx: Context, callback: () => void): void {
    if (this._persistentInvitationsLoaded) {
      callback();
    } else {
      this._persistentInvitationsLoadedEvent.once(ctx, () => callback());
    }
  }

  private _createInvitation(protocol: InvitationProtocol, _options?: Partial<Invitation>): Invitation {
    const {
      invitationId = PublicKey.random().toHex(),
      type = Invitation_Type.INTERACTIVE,
      authMethod = Invitation_AuthMethod.SHARED_SECRET,
      state = Invitation_State.INIT,
      timeout = INVITATION_TIMEOUT,
      swarmKey = fromPublicKey(PublicKey.random()),
      persistent = _options?.authMethod !== Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
      created = bufWkt.timestampNow(),
      guestKeypair = undefined,
      role = SpaceMember_Role.ADMIN,
      lifetime = 86400 * 7, // 7 days,
      multiUse = false,
      ...options
    } = _options ?? {};
    const authCode =
      options?.authCode ??
      (authMethod === Invitation_AuthMethod.SHARED_SECRET ? generatePasscode(AUTHENTICATION_CODE_LENGTH) : undefined);

    return buf.create(InvitationSchema, {
      invitationId,
      type,
      authMethod,
      state,
      swarmKey,
      authCode,
      timeout,
      persistent: persistent && type !== Invitation_Type.DELEGATED, // delegated invitations are persisted in control feed
      guestKeypair:
        guestKeypair ?? (authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY ? createAdmissionKeypair() : undefined),
      created,
      lifetime,
      role,
      multiUse,
      delegationCredentialId: options?.delegationCredentialId,
      ...bufInit(options),
      ...bufInit(protocol.getInvitationContext()),
    });
  }

  private _createObservableInvitation(
    ctx: Context,
    handler: InvitationProtocol,
    invitation: Invitation,
  ): { ctx: Context; stream: PushStream<Invitation>; observableInvitation: CancellableInvitation } {
    const stream = new PushStream<Invitation>();
    const invitationCtx = ctx.derive({
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
        stream.next({ ...invitation, state: Invitation_State.CANCELLED });
        await invitationCtx.dispose();
      },
    });
    return { ctx: invitationCtx, stream, observableInvitation };
  }

  private _createObservableAcceptingInvitation(
    parentCtx: Context,
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
    // Derive from caller ctx so `TRACE_SPAN_ATTRIBUTE` propagates via the parent chain.
    const ctx = parentCtx.derive({
      onError: (err) => {
        if (err instanceof TimeoutError) {
          log('timeout', { ...handler.toJSON() });
          stream.next({ ...initialState, state: Invitation_State.TIMEOUT });
        } else {
          log.warn('auth failed', err);
          stream.next({ ...initialState, state: Invitation_State.ERROR });
        }
        void ctx.dispose();
      },
    });
    ctx.onDispose(() => {
      log('complete', { ...handler.toJSON() });
      stream.complete();
    });
    const invitation = new AuthenticatingInvitation({
      initialInvitation: initialState,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...initialState, state: Invitation_State.CANCELLED });
        await ctx.dispose();
      },
      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Event?
        otpEnteredTrigger.wake(code);
      },
    });
    return { ctx, invitation, stream, otpEnteredTrigger };
  }

  private async _persistIfRequired(
    handler: InvitationProtocol,
    changeStream: PushStream<Invitation>,
    invitation: Invitation,
  ): Promise<void> {
    if (invitation.type === Invitation_Type.DELEGATED && invitation.delegationCredentialId == null) {
      const delegationCredentialId = await handler.delegate(invitation);
      changeStream.next({ ...invitation, delegationCredentialId: fromPublicKey(delegationCredentialId) });
    } else if (invitation.persistent) {
      await this._metadataStore.addInvitation(fromBufInvitation(invitation));
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

  private _onInvitationComplete(invitation: CancellableInvitation, callback: () => void): void {
    invitation.subscribe(
      () => {},
      () => {},
      callback,
    );
  }
}

/**
 * Effect Layer constructing an {@link InvitationsManager}.
 *
 * The invitation handler factory points "up the stack" and is wired via
 * {@link InvitationsManager.setInvitationHandlerFactory} after composition.
 */
export const InvitationsManagerLayer = (): Layer.Layer<
  InvitationsManagerService,
  never,
  InvitationsHandlerService | IMetadataStoreService
> =>
  Layer.effect(
    InvitationsManagerService,
    Effect.gen(function* () {
      const invitationsHandler = yield* InvitationsHandlerService;
      const metadataStore = yield* IMetadataStoreService;
      return new InvitationsManager(invitationsHandler, metadataStore);
    }),
  );
