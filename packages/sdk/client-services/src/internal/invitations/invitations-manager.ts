//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, PushStream, TimeoutError, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitation,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitation,
  INVITATION_TIMEOUT,
} from '@dxos/client-protocol';
import { type Context, ContextDisposedError } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Hook from '@dxos/effect/Hook';
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
import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type InvitationsService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';

import type { InvitationProtocol } from '../../contracts/invitation-protocol.ts';
import * as InvitationsContract from '../../contracts/invitations.ts';
import * as Events from '../../Events.ts';
import { type IMetadataStore, IMetadataStoreService, hasInvitationExpired } from '../metadata/index.ts';
import { type InvitationsHandler, InvitationsHandlerService, createAdmissionKeypair } from './invitations-handler.ts';

/**
 * Whether a host invitation can no longer be redeemed; a multi-use invitation stays open after a SUCCESS.
 */
const hasEnded = ({ state, multiUse }: Invitation): boolean =>
  state === Invitation_State.CANCELLED ||
  state === Invitation_State.EXPIRED ||
  (state === Invitation_State.SUCCESS && !multiUse);

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

  /**
   * Resolves the protocol for an invitation kind; throws until a factory has been wired.
   */
  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol {
    invariant(this._invitationHandlerFactory, 'Invitation handler factory not set.');
    return this._invitationHandlerFactory(invitation);
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  async createInvitation(
    ctx: Context,
    options: Partial<Invitation> & Pick<Invitation, 'kind'>,
  ): Promise<CancellableInvitation> {
    return this._hostInvitation(ctx, options, { restored: false });
  }

  /**
   * @param restored - The invitation was loaded from the metadata store, so it is already persisted.
   */
  private async _hostInvitation(
    ctx: Context,
    options: Partial<Invitation> & Pick<Invitation, 'kind'>,
    { restored }: { restored: boolean },
  ): Promise<CancellableInvitation> {
    if (options.invitationId) {
      const existingInvitation = this._createInvitations.get(options.invitationId);
      if (existingInvitation) {
        return existingInvitation;
      }
    }

    const handler = this.getInvitationHandler(options);
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
    // onComplete is called on cancel, expiration, or redemption of a single-use invitation, and when `ctx` is
    // disposed. A restored invitation's `ctx` is the stack's, so disposal there is a shutdown: it must stay
    // persisted to be hosted again on the next start.
    this._onInvitationComplete(observableInvitation, async () => {
      const current = observableInvitation.get();
      this._createInvitations.delete(current.invitationId);
      this.removedCreated.emit(current);
      if (current.persistent && (!restored || hasEnded(current))) {
        await this._safeDeleteInvitation(current);
      }
    });

    if (!restored) {
      try {
        await this._persistIfRequired(handler, stream, invitation);
      } catch (err) {
        log.catch(err);
        await observableInvitation.cancel();
        return observableInvitation;
      }
    }

    this._invitationsHandler.handleInvitationFlow(invitationCtx, stream, handler, observableInvitation.get(), {
      // A redeemed single-use invitation must not be re-hosted on the next start.
      beforeSingleUseComplete: async () => {
        if (observableInvitation.get().persistent) {
          await this._metadataStore.removeInvitation(observableInvitation.get().invitationId);
        }
      },
    });

    return observableInvitation;
  }

  /**
   * Re-hosts the invitations saved in the metadata store.
   *
   * An invitation whose resource is not ready yet (e.g. its space has not loaded its member state) is
   * re-hosted in the background once it is, so it is not part of the returned set.
   */
  async loadPersistentInvitations(ctx: Context): Promise<{ invitations: Invitation[] }> {
    if (this._persistentInvitationsLoaded) {
      const invitations = this.getCreatedInvitations().filter((i) => i.persistent);
      return { invitations };
    }
    try {
      const persistentInvitations = this._metadataStore.getInvitations();
      // Expired invitations are removed from storage by the metadata store.
      const freshInvitations = persistentInvitations.filter((invitation) => !hasInvitationExpired(invitation));

      const loaded = await Promise.all(
        freshInvitations.map(async (persistentInvitation) => {
          invariant(!this._createInvitations.get(persistentInvitation.invitationId), 'invitation already exists');
          const handler = this.getInvitationHandler(persistentInvitation);
          if (handler.checkCanInviteNewMembers() != null && handler.waitUntilReady) {
            this._restoreWhenReady(ctx, (readyCtx) => handler.waitUntilReady?.(readyCtx), persistentInvitation);
            return undefined;
          }

          try {
            const invitation = await this._hostInvitation(ctx, persistentInvitation, { restored: true });
            return invitation.get();
          } catch (err) {
            log.warn('failed to restore persistent invitation', {
              invitationId: persistentInvitation.invitationId,
              error: String(err),
            });
            return undefined;
          }
        }),
      );

      return { invitations: loaded.filter((invitation) => invitation != null) };
    } catch (err) {
      log.catch(err);
      return { invitations: [] };
    } finally {
      this._persistentInvitationsLoadedEvent.emit();
      this._persistentInvitationsLoaded = true;
    }
  }

  private _restoreWhenReady(
    ctx: Context,
    waitUntilReady: (ctx: Context) => Promise<void> | undefined,
    persistentInvitation: Invitation,
  ): void {
    const { invitationId } = persistentInvitation;
    log('deferring persistent invitation until ready', { invitationId });
    void (async () => {
      try {
        await waitUntilReady(ctx);
        if (ctx.disposed || this._createInvitations.has(invitationId)) {
          return;
        }
        await this._hostInvitation(ctx, persistentInvitation, { restored: true });
      } catch (err) {
        if (err instanceof ContextDisposedError || ctx.disposed) {
          return;
        }
        log.warn('failed to restore persistent invitation', { invitationId, error: String(err) });
      }
    })();
  }

  /**
   * The profile is the shape the device credential is signed over, not the wire shape the
   * service receives — {@link InvitationsServiceImpl} converts before calling this.
   */
  acceptInvitation(
    ctx: Context,
    request: {
      invitation: InvitationsService.AcceptInvitationRequest['invitation'];
      deviceProfile?: DeviceProfileDocument;
    },
  ): AuthenticatingInvitation {
    const options = request.invitation;
    const existingInvitation = this._acceptInvitations.get(options.invitationId);
    if (existingInvitation) {
      return existingInvitation;
    }

    const handler = this.getInvitationHandler(options);
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
        const handler = this.getInvitationHandler(created.get());
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
      lifetime = 86400 * 7, // 7 days.
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
      persistent: persistent && type !== Invitation_Type.DELEGATED, // Delegated invitations are persisted in the control feed.
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
  InvitationsContract.ManagerService,
  never,
  Hook.Controller | InvitationsHandlerService | IMetadataStoreService
> =>
  Layer.effect(
    InvitationsContract.ManagerService,
    Effect.gen(function* () {
      const invitationsHandler = yield* InvitationsHandlerService;
      const metadataStore = yield* IMetadataStoreService;
      const invitationsManager = new InvitationsManager(invitationsHandler, metadataStore);

      const ctx = yield* EffectEx.contextFromScope();
      yield* Hook.on(
        Events.StackOpened,
        Effect.fn('InvitationsManager.onStackOpened')(function* () {
          const loaded = yield* Effect.promise(() => invitationsManager.loadPersistentInvitations(ctx));
          log('loaded persistent invitations', { count: loaded.invitations.length });
        }),
      );
      return invitationsManager;
    }),
  );
