//
// Copyright 2022 DXOS.org
//

import { type Mutex, type MutexGuard, Trigger, scheduleTask } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { randomBytes, verify } from '@dxos/crypto';
import { InvariantViolation, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { InvalidInvitationExtensionRoleError, trace } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  AuthenticationResponse,
  type InvitationHostService,
  InvitationOptions,
} from '@dxos/protocols/proto/dxos/halo/invitations';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';

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

  onStateUpdate: (newState: Invitation.State) => void;

  admit: (request: AdmissionRequest) => Promise<AdmissionResponse>;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationHostExtension
  extends RpcExtension<
    { InvitationHostService: InvitationHostService },
    { InvitationHostService: InvitationHostService }
  >
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
        InvitationHostService: schema.getService('dxos.halo.invitations.InvitationHostService'),
      },
      exposed: {
        InvitationHostService: schema.getService('dxos.halo.invitations.InvitationHostService'),
      },
    });
  }

  public hasFlowLock(): boolean {
    return this._invitationFlowLock != null;
  }

  protected override async getHandlers(): Promise<{ InvitationHostService: InvitationHostService }> {
    return {
      // TODO(dmaretskyi): For now this is just forwarding the data to callbacks since we don't have session-specific logic.
      // Perhaps in the future we will have more complex logic here.
      InvitationHostService: {
        options: async (options) => {
          invariant(!this._remoteOptions, 'Remote options already set.');
          this._remoteOptions = options;
          this._remoteOptionsTrigger.wake();
        },

        introduce: async (request) => {
          const { profile, invitationId } = request;
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.begin({ id: traceId }));

          const invitation = this._requireActiveInvitation();
          this._assertInvitationState(Invitation.State.CONNECTED);
          if (invitationId !== invitation?.invitationId) {
            log.warn('incorrect invitationId', { expected: invitation.invitationId, actual: invitationId });
            this._callbacks.onError(new Error('Incorrect invitationId.'));
            scheduleTask(this._ctx, () => this.close());
            // TODO(dmaretskyi): Better error handling.
            return {
              authMethod: Invitation.AuthMethod.NONE,
            };
          }

          log.verbose('guest introduced themselves', { guestProfile: profile });
          this.guestProfile = profile;
          this._callbacks.onStateUpdate(Invitation.State.READY_FOR_AUTHENTICATION);
          this._challenge =
            invitation.authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY ? randomBytes(32) : undefined;

          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.end({ id: traceId }));
          return {
            authMethod: invitation.authMethod,
            challenge: this._challenge,
          };
        },

        authenticate: async ({ authCode: code, signedChallenge }) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.begin({ id: traceId }));

          const invitation = this._requireActiveInvitation();
          log.verbose('received authentication request', { authCode: code });
          let status = AuthenticationResponse.Status.OK;

          this._assertInvitationState([Invitation.State.AUTHENTICATING, Invitation.State.READY_FOR_AUTHENTICATION]);
          this._callbacks.onStateUpdate(Invitation.State.AUTHENTICATING);

          switch (invitation.authMethod) {
            case Invitation.AuthMethod.NONE: {
              log('authentication not required');
              return { status: AuthenticationResponse.Status.OK };
            }

            case Invitation.AuthMethod.SHARED_SECRET: {
              if (invitation.authCode) {
                if (this.authenticationRetry++ > MAX_OTP_ATTEMPTS) {
                  status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
                } else if (code !== invitation.authCode) {
                  status = AuthenticationResponse.Status.INVALID_OTP;
                } else {
                  this.authenticationPassed = true;
                }
              }
              break;
            }

            case Invitation.AuthMethod.KNOWN_PUBLIC_KEY: {
              if (!invitation.guestKeypair) {
                status = AuthenticationResponse.Status.INTERNAL_ERROR;
                break;
              }
              const isSignatureValid =
                this._challenge &&
                verify(
                  this._challenge,
                  Buffer.from(signedChallenge ?? []),
                  invitation.guestKeypair.publicKey.asBuffer(),
                );
              if (isSignatureValid) {
                this.authenticationPassed = true;
              } else {
                status = AuthenticationResponse.Status.INVALID_SIGNATURE;
              }
              break;
            }

            default: {
              log.error('invalid authentication method', { authMethod: invitation.authMethod });
              status = AuthenticationResponse.Status.INTERNAL_ERROR;
              break;
            }
          }

          if (![AuthenticationResponse.Status.OK, AuthenticationResponse.Status.INVALID_OTP].includes(status)) {
            this._callbacks.onError(new Error(`Authentication failed, with status=${status}`));
            scheduleTask(this._ctx, () => this.close());
            return { status };
          }

          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.end({ id: traceId, data: { status } }));
          return { status };
        },

        admit: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.admit', trace.begin({ id: traceId }));
          const invitation = this._requireActiveInvitation();

          try {
            // Check authenticated.
            if (isAuthenticationRequired(invitation)) {
              this._assertInvitationState(Invitation.State.AUTHENTICATING);
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
      this._callbacks.onStateUpdate(Invitation.State.CONNECTING);
      await this.rpc.InvitationHostService.options({ role: InvitationOptions.Role.HOST });
      log.verbose('options sent');
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      log.verbose('options received');
      if (this._remoteOptions?.role !== InvitationOptions.Role.GUEST) {
        throw new InvalidInvitationExtensionRoleError({
          context: {
            expected: InvitationOptions.Role.GUEST,
            remoteOptions: this._remoteOptions,
            remotePeerId: context.remotePeerId,
          },
        });
      }
      this._callbacks.onStateUpdate(Invitation.State.CONNECTED);
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

  private _assertInvitationState(stateOrMany: Invitation.State | Invitation.State[]): void {
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
  invitation.authMethod !== Invitation.AuthMethod.NONE;
