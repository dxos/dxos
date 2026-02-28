//
// Copyright 2022 DXOS.org
//

import { type Mutex, type MutexGuard, Trigger, scheduleTask } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { randomBytes, verify } from '@dxos/crypto';
import { InvariantViolation, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { InvalidInvitationExtensionRoleError, type Rpc, trace } from '@dxos/protocols';
import { create, EMPTY, toPublicKey } from '@dxos/protocols/buf';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_State,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type ProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  AuthenticationResponse_Status,
  AuthenticationResponseSchema,
  InvitationHostService,
  type InvitationOptions,
  InvitationOptions_Role,
  IntroductionResponseSchema,
  type IntroductionResponse,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { type ExtensionContext, BufRpcExtension } from '@dxos/teleport';

import type { FlowLockHolder } from './invitation-state';
import { stateToString, tryAcquireBeforeContextDisposed } from './utils';

/// Timeout for the options exchange.
const OPTIONS_TIMEOUT = 10_000;

export const MAX_OTP_ATTEMPTS = 3;

type InvitationHostExtensionCallbacks = {
  activeInvitation: Invitation | null;

  // Deliberately not async to not block the extensions opening.
  onOpen: (ctx: Context, extensionCtx: ExtensionContext) => void;
  onError: (error: Error) => void;

  onStateUpdate: (newState: Invitation_State) => void;

  admit: (request: AdmissionRequest) => Promise<AdmissionResponse>;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
type InvitationServices = { InvitationHostService: typeof InvitationHostService };

export class InvitationHostExtension
  extends BufRpcExtension<InvitationServices, InvitationServices>
  implements FlowLockHolder
{
  /**
   * @internal
   */
  private _ctx = new Context();
  private _remoteOptions?: InvitationOptions;
  private _remoteOptionsTrigger = new Trigger();

  private _challenge?: Buffer = undefined;

  public guestProfile?: ProfileDocument = undefined;

  public authenticationPassed = false;

  /**
   * Retry counter for SHARED_SECRET authentication method.
   */
  public authenticationRetry = 0;

  /**
   * Resolved when admission is completed.
   */
  public completedTrigger = new Trigger<PublicKey>();

  /**
   * Held to allow only one invitation flow at a time to be active.
   */
  private _invitationFlowLock: MutexGuard | null = null;

  constructor(
    private readonly _invitationFlowMutex: Mutex,
    private readonly _callbacks: InvitationHostExtensionCallbacks,
  ) {
    super({
      requested: {
        InvitationHostService,
      },
      exposed: {
        InvitationHostService,
      },
    });
  }

  public hasFlowLock(): boolean {
    return this._invitationFlowLock != null;
  }

  protected override async getHandlers(): Promise<Rpc.BufServiceHandlers<InvitationServices>> {
    return {
      InvitationHostService: {
        options: async (options) => {
          invariant(!this._remoteOptions, 'Remote options already set.');
          this._remoteOptions = options;
          this._remoteOptionsTrigger.wake();
          return EMPTY;
        },

        introduce: async (request) => {
          const { profile, invitationId } = request;
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.begin({ id: traceId }));

          const invitation = this._requireActiveInvitation();
          this._assertInvitationState(Invitation_State.CONNECTED);
          if (invitationId !== invitation?.invitationId) {
            log.warn('incorrect invitationId', { expected: invitation.invitationId, actual: invitationId });
            this._callbacks.onError(new Error('Incorrect invitationId.'));
            scheduleTask(this._ctx, () => this.close());
            return create(IntroductionResponseSchema, {
              authMethod: Invitation_AuthMethod.NONE,
            });
          }

          log.verbose('guest introduced themselves', { guestProfile: profile });
          this.guestProfile = profile;
          this._callbacks.onStateUpdate(Invitation_State.READY_FOR_AUTHENTICATION);
          this._challenge =
            invitation.authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY ? randomBytes(32) : undefined;

          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.end({ id: traceId }));
          return create(IntroductionResponseSchema, {
            authMethod: invitation.authMethod,
            challenge: this._challenge,
          });
        },

        authenticate: async (request) => {
          const { authCode: code, signedChallenge } = request;
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.begin({ id: traceId }));

          const invitation = this._requireActiveInvitation();
          log.verbose('received authentication request', { authCode: code });
          let status = AuthenticationResponse_Status.OK;

          this._assertInvitationState([Invitation_State.AUTHENTICATING, Invitation_State.READY_FOR_AUTHENTICATION]);
          this._callbacks.onStateUpdate(Invitation_State.AUTHENTICATING);

          switch (invitation.authMethod) {
            case Invitation_AuthMethod.NONE: {
              log('authentication not required');
              return create(AuthenticationResponseSchema, { status: AuthenticationResponse_Status.OK });
            }

            case Invitation_AuthMethod.SHARED_SECRET: {
              if (invitation.authCode) {
                if (this.authenticationRetry++ > MAX_OTP_ATTEMPTS) {
                  status = AuthenticationResponse_Status.INVALID_OPT_ATTEMPTS;
                } else if (code !== invitation.authCode) {
                  status = AuthenticationResponse_Status.INVALID_OTP;
                } else {
                  this.authenticationPassed = true;
                }
              }
              break;
            }

            case Invitation_AuthMethod.KNOWN_PUBLIC_KEY: {
              if (!invitation.guestKeypair) {
                status = AuthenticationResponse_Status.INTERNAL_ERROR;
                break;
              }
              invariant(invitation.guestKeypair.publicKey);
              const pubKey = invitation.guestKeypair.publicKey;
              const pubKeyBytes = pubKey instanceof Uint8Array ? pubKey : (pubKey as any).data ?? toPublicKey(pubKey).asUint8Array();
              const isSignatureValid =
                this._challenge &&
                verify(
                  this._challenge,
                  Buffer.from(signedChallenge ?? []),
                  Buffer.from(pubKeyBytes),
                );
              if (isSignatureValid) {
                this.authenticationPassed = true;
              } else {
                status = AuthenticationResponse_Status.INVALID_SIGNATURE;
              }
              break;
            }

            default: {
              log.error('invalid authentication method', { authMethod: invitation.authMethod });
              status = AuthenticationResponse_Status.INTERNAL_ERROR;
              break;
            }
          }

          if (![AuthenticationResponse_Status.OK, AuthenticationResponse_Status.INVALID_OTP].includes(status)) {
            this._callbacks.onError(new Error(`Authentication failed, with status=${status}`));
            scheduleTask(this._ctx, () => this.close());
            return create(AuthenticationResponseSchema, { status });
          }

          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.end({ id: traceId, data: { status } }));
          return create(AuthenticationResponseSchema, { status });
        },

        admit: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.admit', trace.begin({ id: traceId }));
          const invitation = this._requireActiveInvitation();

          try {
            if (isAuthenticationRequired(invitation)) {
              this._assertInvitationState(Invitation_State.AUTHENTICATING);
              if (!this.authenticationPassed) {
                throw new Error('Not authenticated');
              }
            }

            const response = await this._callbacks.admit(request);

            log.trace('dxos.sdk.invitation-handler.host.admit', trace.end({ id: traceId }));
            return response;
          } catch (err: any) {
            this._callbacks.onError(err);
            throw err;
          }
        },
      },
    };
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);

    try {
      log.verbose('host acquire lock');
      this._invitationFlowLock = await tryAcquireBeforeContextDisposed(this._ctx, this._invitationFlowMutex);
      log.verbose('host lock acquired');
      this._callbacks.onStateUpdate(Invitation_State.CONNECTING);
      await this.rpc.InvitationHostService.options({ role: InvitationOptions_Role.HOST });
      log.verbose('options sent');
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      log.verbose('options received');
      if (this._remoteOptions?.role !== InvitationOptions_Role.GUEST) {
        throw new InvalidInvitationExtensionRoleError({
          context: {
            expected: InvitationOptions_Role.GUEST,
            remoteOptions: this._remoteOptions,
            remotePeerId: context.remotePeerId,
          },
        });
      }
      this._callbacks.onStateUpdate(Invitation_State.CONNECTED);
      this._callbacks.onOpen(this._ctx, context);
    } catch (err: any) {
      if (this._invitationFlowLock != null) {
        this._callbacks.onError(err);
      }
      if (!this._ctx.disposed) {
        context.close(err);
      }
    }
  }

  private _requireActiveInvitation(): Invitation {
    const invitation = this._callbacks.activeInvitation;
    if (invitation == null) {
      scheduleTask(this._ctx, () => this.close());
      throw new Error('Active invitation not found');
    }
    return invitation;
  }

  private _assertInvitationState(stateOrMany: Invitation_State | Invitation_State[]): void {
    const invitation = this._requireActiveInvitation();
    const validStates = Array.isArray(stateOrMany) ? stateOrMany : [stateOrMany];
    if (!validStates.includes(invitation.state)) {
      scheduleTask(this._ctx, () => this.close());
      throw new InvariantViolation(
        `Expected ${stateToString(invitation.state)} to be one of [${validStates.map(stateToString).join(', ')}]`,
      );
    }
  }

  override async onClose(): Promise<void> {
    await this._destroy();
  }

  override async onAbort(): Promise<void> {
    await this._destroy();
  }

  private async _destroy(): Promise<void> {
    await this._ctx.dispose();
    if (this._invitationFlowLock != null) {
      this._invitationFlowLock?.release();
      this._invitationFlowLock = null;
      log.verbose('invitation flow lock released');
    }
  }
}

export const isAuthenticationRequired = (invitation: Invitation) =>
  invitation.authMethod !== Invitation_AuthMethod.NONE;
