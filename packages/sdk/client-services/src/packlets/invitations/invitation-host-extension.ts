//
// Copyright 2022 DXOS.org
//

import { type Mutex, type MutexGuard, Trigger } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { randomBytes, verify } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { InvalidInvitationExtensionRoleError, schema, trace } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  AuthenticationResponse,
  type IntroductionRequest,
  type InvitationHostService,
  Options,
} from '@dxos/protocols/proto/dxos/halo/invitations';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';

/// Timeout for the options exchange.
const OPTIONS_TIMEOUT = 10_000;

export const MAX_OTP_ATTEMPTS = 3;

type InvitationHostExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
  onError: (error: Error) => void;

  onStateUpdate: (invitation: Invitation) => void;

  resolveInvitation: (request: IntroductionRequest) => Promise<Invitation | undefined>;

  admit: (request: AdmissionRequest) => Promise<AdmissionResponse>;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationHostExtension extends RpcExtension<
  { InvitationHostService: InvitationHostService },
  { InvitationHostService: InvitationHostService }
> {
  /**
   * @internal
   */
  private _ctx = new Context();
  private _remoteOptions?: Options;
  private _remoteOptionsTrigger = new Trigger();

  private _challenge?: Buffer = undefined;

  public invitation?: Invitation = undefined;

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

          const invitation = await this._callbacks.resolveInvitation(request);
          if (!invitation) {
            log.warn('invitation not found', { invitationId });
            this._callbacks.onError(new Error('Invitation not found.'));
            // TODO(dmaretskyi): Better error handling.
            return {
              authMethod: Invitation.AuthMethod.NONE,
            };
          }
          this.invitation = invitation;

          log('guest introduced themselves', { guestProfile: profile });
          this.guestProfile = profile;

          this._callbacks.onStateUpdate({ ...this.invitation, state: Invitation.State.READY_FOR_AUTHENTICATION });

          this._challenge =
            this.invitation.authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY ? randomBytes(32) : undefined;

          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.end({ id: traceId }));
          return {
            authMethod: this.invitation.authMethod,
            challenge: this._challenge,
          };
        },

        authenticate: async ({ authCode: code, signedChallenge }) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.begin({ id: traceId }));
          log('received authentication request', { authCode: code });
          let status = AuthenticationResponse.Status.OK;

          invariant(this.invitation, 'Invitation is not set.');
          switch (this.invitation.authMethod) {
            case Invitation.AuthMethod.NONE: {
              log('authentication not required');
              return { status: AuthenticationResponse.Status.OK };
            }

            case Invitation.AuthMethod.SHARED_SECRET: {
              if (this.invitation.authCode) {
                if (this.authenticationRetry++ > MAX_OTP_ATTEMPTS) {
                  status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
                } else if (code !== this.invitation.authCode) {
                  status = AuthenticationResponse.Status.INVALID_OTP;
                } else {
                  this.authenticationPassed = true;
                }
              }
              break;
            }

            case Invitation.AuthMethod.KNOWN_PUBLIC_KEY: {
              if (!this.invitation.guestKeypair) {
                status = AuthenticationResponse.Status.INTERNAL_ERROR;
                break;
              }
              const isSignatureValid =
                this._challenge &&
                verify(
                  this._challenge,
                  Buffer.from(signedChallenge ?? []),
                  this.invitation.guestKeypair.publicKey.asBuffer(),
                );
              if (isSignatureValid) {
                this.authenticationPassed = true;
              } else {
                status = AuthenticationResponse.Status.INVALID_SIGNATURE;
              }
              break;
            }

            default: {
              log.error('invalid authentication method', { authMethod: this.invitation.authMethod });
              status = AuthenticationResponse.Status.INTERNAL_ERROR;
              break;
            }
          }

          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.end({ id: traceId, data: { status } }));
          return { status };
        },

        admit: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.admit', trace.begin({ id: traceId }));

          try {
            invariant(this.invitation, 'Invitation is not set.');
            // Check authenticated.
            if (isAuthenticationRequired(this.invitation) && !this.authenticationPassed) {
              throw new Error('Not authenticated');
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

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);

    try {
      this._invitationFlowLock = await cancelWithContext(this._ctx, this._invitationFlowMutex.acquire());
      await this.rpc.InvitationHostService.options({ role: Options.Role.HOST });
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      if (this._remoteOptions?.role !== Options.Role.GUEST) {
        throw new InvalidInvitationExtensionRoleError(undefined, {
          expected: Options.Role.GUEST,
          remoteOptions: this._remoteOptions,
          remotePeerId: context.remotePeerId,
        });
      }

      this._callbacks.onOpen();
    } catch (err: any) {
      this._callbacks.onError(err);
    }
  }

  override async onClose() {
    this._invitationFlowLock?.release();
    this._invitationFlowLock = null;
    await this._ctx.dispose();
  }
}

export const isAuthenticationRequired = (invitation: Invitation) =>
  invitation.authMethod !== Invitation.AuthMethod.NONE;
