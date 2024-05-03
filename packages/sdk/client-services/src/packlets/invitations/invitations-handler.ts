//
// Copyright 2022 DXOS.org
//

import { Mutex, type PushStream, scheduleTask, TimeoutError, type Trigger } from '@dxos/async';
import { INVITATION_TIMEOUT } from '@dxos/client-protocol';
import { type Context } from '@dxos/context';
import { createKeyPair, sign } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, type NetworkManager, type SwarmConnection } from '@dxos/network-manager';
import { InvalidInvitationExtensionRoleError, trace } from '@dxos/protocols';
import { type AdmissionKeypair, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse, type IntroductionResponse } from '@dxos/protocols/proto/dxos/halo/invitations';
import { Options } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type ExtensionContext, type TeleportExtension, type TeleportParams } from '@dxos/teleport';
import { ComplexSet } from '@dxos/util';

import { InvitationGuestExtension } from './invitation-guest-extenstion';
import { InvitationHostExtension, isAuthenticationRequired, MAX_OTP_ATTEMPTS } from './invitation-host-extension';
import { type InvitationProtocol } from './invitation-protocol';
import { InvitationTopology } from './invitation-topology';

const MAX_DELEGATED_INVITATION_HOST_TRIES = 3;

/**
 * Generic handler for Halo and Space invitations.
 * Handles the life-cycle of invitations between peers.
 *
 * Host
 * - Creates an invitation containing a swarm topic (which can be shared via a URL, QR code, or direct message).
 * - Joins the swarm with the topic and waits for guest's introduction.
 * - Wait for guest to authenticate with challenge specified in the invitation.
 * - Waits for guest to present credentials (containing local device and feed keys).
 * - Writes credentials to control feed then exits or waits for more guests (multi use invitations).
 *
 * Guest
 * - Joins the swarm with the topic.
 * - Sends an introduction.
 * - Submits the challenge.
 * - If Space handler then creates a local cloned space (with genesis block).
 * - Sends admission credentials.
 *  ```
 *  [Guest]                                          [Host]
 *   |------------------------------------Introduce-->|
 *   |-------------------------------[Authenticate]-->|
 *   |----------------------------------------Admit-->|
 *  ```
 */
export class InvitationsHandler {
  /**
   * @internal
   */
  constructor(
    private readonly _networkManager: NetworkManager,
    private readonly _defaultTeleportParams?: Partial<TeleportParams>,
  ) {}

  handleInvitationFlow(
    ctx: Context,
    stream: PushStream<Invitation>,
    protocol: InvitationProtocol,
    invitation: Invitation,
  ): void {
    const guardedState = this._createGuardedState(ctx, invitation, stream);
    // Called for every connecting peer.
    const createExtension = (): InvitationHostExtension => {
      const extension = new InvitationHostExtension(guardedState.mutex, {
        get activeInvitation() {
          return ctx.disposed ? null : guardedState.current;
        },

        onStateUpdate: (newState: Invitation.State): Invitation => {
          return guardedState.set(extension, newState);
        },

        admit: async (admissionRequest) => {
          try {
            const deviceKey = admissionRequest.device?.deviceKey ?? admissionRequest.space?.deviceKey;
            invariant(deviceKey);
            const admissionResponse = await protocol.admit(invitation, admissionRequest, extension.guestProfile);

            // Updating credentials complete.
            extension.completedTrigger.wake(deviceKey);

            return admissionResponse;
          } catch (err: any) {
            // TODO(burdon): Generic RPC callback to report error to client.
            guardedState.set(extension, Invitation.State.ERROR);
            throw err; // Propagate error to guest.
          }
        },

        onOpen: (connectionCtx: Context, extensionsCtx: ExtensionContext) => {
          let admitted = false;
          connectionCtx.onDispose(() => {
            if (!admitted) {
              guardedState.set(extension, Invitation.State.ERROR);
            }
          });

          scheduleTask(connectionCtx, async () => {
            const traceId = PublicKey.random().toHex();
            try {
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.begin({ id: traceId }));
              log('connected', { ...protocol.toJSON() });
              const deviceKey = await extension.completedTrigger.wait({ timeout: invitation.timeout });
              log('admitted guest', { guest: deviceKey, ...protocol.toJSON() });
              guardedState.set(extension, Invitation.State.SUCCESS);
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.end({ id: traceId }));
              admitted = true;

              if (!invitation.multiUse) {
                await ctx.dispose();
              }
            } catch (err: any) {
              if (err instanceof TimeoutError) {
                log('timeout', { ...protocol.toJSON() });
                guardedState.set(extension, Invitation.State.TIMEOUT);
              } else {
                log.error('failed', err);
                guardedState.set(extension, Invitation.State.ERROR);
              }
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.error({ id: traceId, error: err }));
              // Close connection
              extensionsCtx.close(err);
            }
          });
        },
        onError: (err) => {
          if (err instanceof InvalidInvitationExtensionRoleError) {
            log('invalid role', { ...err.context });
            return;
          }
          if (err instanceof TimeoutError) {
            log('timeout', { err });
            guardedState.set(extension, Invitation.State.TIMEOUT);
          } else {
            log.error('failed', err);
            guardedState.set(extension, Invitation.State.ERROR);
          }
        },
      });

      return extension;
    };

    if (invitation.lifetime && invitation.created) {
      if (invitation.created.getTime() + invitation.lifetime * 1000 < Date.now()) {
        log.warn('invitation has already expired');
      } else {
        scheduleTask(
          ctx,
          async () => {
            // ensure the swarm is closed before changing state and closing the stream.
            await swarmConnection.close();
            guardedState.set(null, Invitation.State.EXPIRED);
            await ctx.dispose();
          },
          invitation.created.getTime() + invitation.lifetime * 1000 - Date.now(),
        );
      }
    }

    let swarmConnection: SwarmConnection;
    scheduleTask(ctx, async () => {
      swarmConnection = await this._joinSwarm(ctx, invitation, Options.Role.HOST, createExtension);
      guardedState.set(null, Invitation.State.CONNECTING);
    });
  }

  acceptInvitation(
    ctx: Context,
    stream: PushStream<Invitation>,
    protocol: InvitationProtocol,
    invitation: Invitation,
    otpEnteredTrigger: Trigger<string>,
    deviceProfile?: DeviceProfileDocument,
  ): void {
    const { timeout = INVITATION_TIMEOUT } = invitation;

    if (deviceProfile) {
      invariant(invitation.kind === Invitation.Kind.DEVICE, 'deviceProfile provided for non-device invitation');
    }

    const triedPeersIds = new ComplexSet(PublicKey.hash);
    const guardedState = this._createGuardedState(ctx, invitation, stream);

    const shouldCancelInvitationFlow = (extension: InvitationGuestExtension) => {
      const isLockedByAnotherConnection = guardedState.mutex.isLocked() && !extension.hasFlowLock();
      log('should cancel invitation flow', {
        isLockedByAnotherConnection,
        invitationType: Invitation.Type.DELEGATED,
        triedPeers: triedPeersIds.size,
      });
      if (isLockedByAnotherConnection) {
        return false;
      }
      // for delegated invitations we might try with other hosts and will dispose either after
      // a timeout or when the number of tries was exceeded
      return invitation.type !== Invitation.Type.DELEGATED || triedPeersIds.size >= MAX_DELEGATED_INVITATION_HOST_TRIES;
    };

    const createExtension = (): InvitationGuestExtension => {
      let admitted = false;
      const extension = new InvitationGuestExtension(guardedState.mutex, {
        onStateUpdate: (newState: Invitation.State) => {
          guardedState.set(extension, newState);
        },
        onOpen: (connectionCtx: Context, extensionCtx: ExtensionContext) => {
          triedPeersIds.add(extensionCtx.remotePeerId);

          connectionCtx.onDispose(async () => {
            log('extension disposed', { currentState: guardedState.current.state });
            if (admitted || shouldCancelInvitationFlow(extension)) {
              guardedState.set(extension, admitted ? Invitation.State.SUCCESS : Invitation.State.ERROR);
              log('disposing guest invitation context');
              await ctx.dispose();
            } else {
              guardedState.set(extension, Invitation.State.ERROR);
            }
          });

          scheduleTask(connectionCtx, async () => {
            const traceId = PublicKey.random().toHex();
            try {
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.begin({ id: traceId }));

              scheduleTask(connectionCtx, () => connectionCtx.raise(new TimeoutError(timeout)), timeout);

              log('connected', { ...protocol.toJSON() });
              guardedState.set(extension, Invitation.State.CONNECTED);

              // 1. Introduce guest to host.
              log('introduce', { ...protocol.toJSON() });
              const introductionResponse = await extension.rpc.InvitationHostService.introduce({
                invitationId: invitation.invitationId,
                ...protocol.createIntroduction(),
              });
              log('introduce response', { ...protocol.toJSON(), response: introductionResponse });
              invitation.authMethod = introductionResponse.authMethod;

              // 2. Get authentication code.
              if (isAuthenticationRequired(invitation)) {
                switch (invitation.authMethod) {
                  case Invitation.AuthMethod.SHARED_SECRET:
                    await this._handleGuestOtpAuth(
                      extension,
                      (state) => guardedState.set(extension, state),
                      otpEnteredTrigger,
                      { timeout },
                    );
                    break;
                  case Invitation.AuthMethod.KNOWN_PUBLIC_KEY:
                    await this._handleGuestKpkAuth(
                      extension,
                      (state) => guardedState.set(extension, state),
                      invitation,
                      introductionResponse,
                    );
                    break;
                }
              }

              // 3. Send admission credentials to host (with local space keys).
              log('request admission', { ...protocol.toJSON() });
              const admissionRequest = await protocol.createAdmissionRequest(deviceProfile);
              const admissionResponse = await extension.rpc.InvitationHostService.admit(admissionRequest);

              // Remote connection no longer needed.
              admitted = true;

              // 4. Record credential in our HALO.
              const result = await protocol.accept(admissionResponse, admissionRequest);

              // 5. Success.
              log('admitted by host', { ...protocol.toJSON() });
              stream.next({
                ...guardedState.current,
                target: result.target,
                state: Invitation.State.SUCCESS,
              });
              await ctx.dispose();
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.end({ id: traceId }));
            } catch (err: any) {
              if (err instanceof TimeoutError) {
                log('timeout', { ...protocol.toJSON() });
                guardedState.set(extension, Invitation.State.TIMEOUT);
              } else {
                log('auth failed', err);
                guardedState.set(extension, Invitation.State.ERROR);
              }
              extensionCtx.close(err);
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.error({ id: traceId, error: err }));
            }
          });
        },
        onError: (err) => {
          if (err instanceof InvalidInvitationExtensionRoleError) {
            return;
          }
          if (err instanceof TimeoutError) {
            log('timeout', { ...protocol.toJSON() });
            guardedState.set(extension, Invitation.State.TIMEOUT);
          } else {
            log('auth failed', err);
            guardedState.set(extension, Invitation.State.ERROR);
          }
        },
      });

      return extension;
    };

    scheduleTask(ctx, async () => {
      const error = protocol.checkInvitation(invitation);
      if (error) {
        guardedState.set(null, Invitation.State.ERROR);
        await ctx.dispose();
      } else {
        invariant(invitation.swarmKey);
        await this._joinSwarm(ctx, invitation, Options.Role.GUEST, createExtension);
        guardedState.set(null, Invitation.State.CONNECTING);
      }
    });
  }

  private async _joinSwarm(
    ctx: Context,
    invitation: Invitation,
    role: Options.Role,
    extensionFactory: () => TeleportExtension,
  ): Promise<SwarmConnection> {
    let label: string;
    if (role === Options.Role.GUEST) {
      label = 'invitation guest';
    } else if (invitation.kind === Invitation.Kind.DEVICE) {
      label = 'invitation host for device';
    } else {
      label = `invitation host for space ${invitation.spaceKey?.truncate()}`;
    }
    const swarmConnection = await this._networkManager.joinSwarm({
      topic: invitation.swarmKey,
      peerId: PublicKey.random(),
      protocolProvider: createTeleportProtocolFactory(async (teleport) => {
        teleport.addExtension('dxos.halo.invitations', extensionFactory());
      }, this._defaultTeleportParams),
      topology: new InvitationTopology(role),
      label,
    });
    ctx.onDispose(() => swarmConnection.close());
    return swarmConnection;
  }

  private _createGuardedState(ctx: Context, invitation: Invitation, stream: PushStream<Invitation>) {
    let currentInvitation = { ...invitation };
    const mutex = new Mutex();
    return {
      mutex,
      get current() {
        return currentInvitation;
      },
      set: (extension: InvitationHostExtension | InvitationGuestExtension | null, newState: Invitation.State) => {
        if (!ctx.disposed && (extension == null || extension.hasFlowLock() || !mutex.isLocked())) {
          currentInvitation = { ...currentInvitation, state: newState };
          stream.next(currentInvitation);
        }
        return currentInvitation;
      },
    };
  }

  private async _handleGuestOtpAuth(
    extension: InvitationGuestExtension,
    setState: (newState: Invitation.State) => void,
    authenticated: Trigger<string>,
    options: { timeout: number },
  ) {
    for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
      log('guest waiting for authentication code...');
      setState(Invitation.State.READY_FOR_AUTHENTICATION);
      const authCode = await authenticated.wait(options);

      log('sending authentication request');
      setState(Invitation.State.AUTHENTICATING);
      const response = await extension.rpc.InvitationHostService.authenticate({ authCode });
      if (response.status === undefined || response.status === AuthenticationResponse.Status.OK) {
        break;
      }

      if (response.status === AuthenticationResponse.Status.INVALID_OTP) {
        if (attempt === MAX_OTP_ATTEMPTS) {
          throw new Error(`Maximum retry attempts: ${MAX_OTP_ATTEMPTS}`);
        } else {
          log('retrying invalid code', { attempt });
          authenticated.reset();
        }
      }
    }
  }

  private async _handleGuestKpkAuth(
    extension: InvitationGuestExtension,
    setState: (newState: Invitation.State) => void,
    invitation: Invitation,
    introductionResponse: IntroductionResponse,
  ) {
    if (invitation.guestKeypair?.privateKey == null) {
      throw new Error('keypair missing in the invitation');
    }
    if (introductionResponse.challenge == null) {
      throw new Error('challenge missing in the introduction');
    }
    log('sending authentication request');
    setState(Invitation.State.AUTHENTICATING);
    const signature = sign(Buffer.from(introductionResponse.challenge), invitation.guestKeypair.privateKey);
    const response = await extension.rpc.InvitationHostService.authenticate({
      signedChallenge: signature,
    });
    if (response.status !== AuthenticationResponse.Status.OK) {
      throw new Error(`Authentication failed with code: ${response.status}`);
    }
  }
}

export const createAdmissionKeypair = (): AdmissionKeypair => {
  const keypair = createKeyPair();
  return { publicKey: PublicKey.from(keypair.publicKey), privateKey: keypair.secretKey };
};
