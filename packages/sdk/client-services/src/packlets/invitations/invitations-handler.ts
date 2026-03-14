//
// Copyright 2022 DXOS.org
//

import { type PushStream, TimeoutError, type Trigger, scheduleTask } from '@dxos/async';
import { INVITATION_TIMEOUT, getExpirationTime } from '@dxos/client-protocol';
import { type Context, ContextDisposedError } from '@dxos/context';
import { createKeyPair, sign } from '@dxos/crypto';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SwarmConnection, type SwarmNetworkManager, createTeleportProtocolFactory } from '@dxos/network-manager';
import { InvalidInvitationError, InvalidInvitationExtensionRoleError, trace } from '@dxos/protocols';
import { type AdmissionKeypair, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse, type IntroductionResponse } from '@dxos/protocols/proto/dxos/halo/invitations';
import { InvitationOptions } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type ExtensionContext, type TeleportExtension, type TeleportProps } from '@dxos/teleport';
import { trace as _trace } from '@dxos/tracing';
import { ComplexSet } from '@dxos/util';

import { type EdgeInvitationConfig, EdgeInvitationHandler } from './edge-invitation-handler';
import { InvitationGuestExtension } from './invitation-guest-extenstion';
import { InvitationHostExtension, MAX_OTP_ATTEMPTS, isAuthenticationRequired } from './invitation-host-extension';
import { type InvitationProtocol } from './invitation-protocol';
import { createGuardedInvitationState } from './invitation-state';
import { InvitationTopology } from './invitation-topology';

const metrics = _trace.metrics;

const MAX_DELEGATED_INVITATION_HOST_TRIES = 3;

export type InvitationConnectionProps = {
  teleport: Partial<TeleportProps>;
  edgeInvitations?: EdgeInvitationConfig;
};

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
 *
 *  TODO: consider refactoring using xstate making the logic separation more explicit:
 *  TODO: the flow logic should either be contained in invitations-handler or in extensions, not be split across
 *  TODO: potentially re-evaluate host-side API to allow multiple concurrent connection, so that mutex can be removed
 */
export class InvitationsHandler {
  /**
   * @internal
   */
  constructor(
    private readonly _networkManager: SwarmNetworkManager,
    private readonly _edgeClient?: EdgeHttpClient,
    private readonly _connectionProps?: InvitationConnectionProps,
  ) {}

  handleInvitationFlow(
    ctx: Context,
    stream: PushStream<Invitation>,
    protocol: InvitationProtocol,
    invitation: Invitation,
  ): void {
    log.verbose('dxos.sdk.invitations-handler.handleInvitationFlow', {
      state: invitation.state,
      invitationId: invitation.invitationId,
      kind: invitation.kind,
      type: invitation.type,
    });
    metrics.increment('dxos.invitation.host');
    const guardedState = createGuardedInvitationState(ctx, invitation, stream);
    // Called for every connecting peer.
    const createExtension = (): InvitationHostExtension => {
      const extension = new InvitationHostExtension(guardedState.mutex, {
        get activeInvitation() {
          return ctx.disposed ? null : guardedState.current;
        },

        onStateUpdate: (newState: Invitation.State): Invitation => {
          if (newState !== Invitation.State.ERROR && newState !== Invitation.State.TIMEOUT) {
            guardedState.set(extension, newState);
          }
          return guardedState.current;
        },

        admit: async (admissionRequest) => {
          try {
            log.verbose('dxos.sdk.invitations-handler.host.admit', {
              invitationId: invitation.invitationId,
              ...protocol.toJSON(),
            });
            const deviceKey = admissionRequest.device?.deviceKey ?? admissionRequest.space?.deviceKey;
            invariant(deviceKey);
            const admissionResponse = await protocol.admit(invitation, admissionRequest, extension.guestProfile);

            // Updating credentials complete.
            extension.completedTrigger.wake(deviceKey);

            return admissionResponse;
          } catch (err: any) {
            // TODO(burdon): Generic RPC callback to report error to client.
            guardedState.error(extension, err);
            throw err; // Propagate error to guest.
          }
        },

        onOpen: (connectionCtx: Context, extensionsCtx: ExtensionContext) => {
          let admitted = false;
          connectionCtx.onDispose(() => {
            if (!admitted) {
              guardedState.set(extension, Invitation.State.CONNECTING);
            }
          });

          scheduleTask(connectionCtx, async () => {
            const traceId = PublicKey.random().toHex();
            try {
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.begin({ id: traceId }));
              log.verbose('connected', { ...protocol.toJSON() });
              const deviceKey = await extension.completedTrigger.wait({ timeout: invitation.timeout });
              log.verbose('admitted guest', { guest: deviceKey, ...protocol.toJSON() });
              guardedState.set(extension, Invitation.State.SUCCESS);
              metrics.increment('dxos.invitation.success');
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.end({ id: traceId }));
              admitted = true;

              if (!invitation.multiUse) {
                await ctx.dispose();
              }
            } catch (err: any) {
              const stateChanged = guardedState.set(extension, Invitation.State.CONNECTING);
              if (err instanceof TimeoutError) {
                if (stateChanged) {
                  metrics.increment('dxos.invitation.timeout');
                  log.verbose('timeout', { ...protocol.toJSON() });
                }
              } else {
                if (stateChanged) {
                  metrics.increment('dxos.invitation.failed');
                  log.error('failed', err);
                }
              }
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.error({ id: traceId, error: err }));
              // Close connection
              extensionsCtx.close(err);
            }
          });
        },
        onError: (err) => {
          const stateChanged = guardedState.set(extension, Invitation.State.CONNECTING);
          if (err instanceof InvalidInvitationExtensionRoleError) {
            log('invalid role', { ...err.context });
            return;
          }
          if (err instanceof TimeoutError) {
            if (stateChanged) {
              metrics.increment('dxos.invitation.timeout');
              log.verbose('timeout', { err });
            }
          } else {
            if (stateChanged) {
              metrics.increment('dxos.invitation.failed');
              log.error('failed', err);
            }
          }
        },
      });

      return extension;
    };

    const expiresOn = getExpirationTime(invitation);
    if (expiresOn) {
      if (expiresOn.getTime() < Date.now()) {
        log.warn('invitation has already expired');
        guardedState.set(null, Invitation.State.EXPIRED);
        void ctx.dispose().catch((err) => log.catch(err));
        return;
      }
      scheduleTask(
        ctx,
        async () => {
          // ensure the swarm is closed before changing state and closing the stream.
          await swarmConnection.close();
          guardedState.set(null, Invitation.State.EXPIRED);
          metrics.increment('dxos.invitation.expired');
          await ctx.dispose();
        },
        expiresOn.getTime() - Date.now(),
      );
    }

    let swarmConnection: SwarmConnection;
    scheduleTask(ctx, async () => {
      swarmConnection = await this._joinSwarm(ctx, invitation, InvitationOptions.Role.HOST, createExtension);
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
    log.verbose('dxos.sdk.invitations-handler.acceptInvitation', {
      state: invitation.state,
      invitationId: invitation.invitationId,
      kind: invitation.kind,
      type: invitation.type,
    });
    const { timeout = INVITATION_TIMEOUT } = invitation;

    if (deviceProfile) {
      invariant(invitation.kind === Invitation.Kind.DEVICE, 'deviceProfile provided for non-device invitation');
    }

    const triedPeersIds = new ComplexSet(PublicKey.hash);
    const guardedState = createGuardedInvitationState(ctx, invitation, stream);

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

    let admitted = false;
    const createExtension = (): InvitationGuestExtension => {
      const extension = new InvitationGuestExtension(guardedState.mutex, {
        onStateUpdate: (newState: Invitation.State) => {
          guardedState.set(extension, newState);
        },
        onOpen: (connectionCtx: Context, extensionCtx: ExtensionContext) => {
          triedPeersIds.add(extensionCtx.remotePeerId);

          if (admitted) {
            extensionCtx.close();
            return;
          }

          connectionCtx.onDispose(async () => {
            log.verbose('extension disposed', { admitted, currentState: guardedState.current.state });
            if (!admitted) {
              guardedState.error(extension, new ContextDisposedError());
              if (shouldCancelInvitationFlow(extension)) {
                await ctx.dispose();
              }
            }
          });

          scheduleTask(connectionCtx, async () => {
            const traceId = PublicKey.random().toHex();
            try {
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.begin({ id: traceId }));

              scheduleTask(
                connectionCtx,
                () => {
                  guardedState.set(extension, Invitation.State.TIMEOUT);
                  extensionCtx.close();
                },
                timeout,
              );

              log.verbose('dxos.sdk.invitations-handler.guest.connected', { ...protocol.toJSON() });
              guardedState.set(extension, Invitation.State.CONNECTED);

              // 1. Introduce guest to host.
              log.verbose('dxos.sdk.invitations-handler.guest.introduce', {
                invitationId: invitation.invitationId,
                ...protocol.toJSON(),
              });
              const introductionResponse = await extension.rpc.InvitationHostService.introduce({
                invitationId: invitation.invitationId,
                ...protocol.createIntroduction(),
              });
              log.verbose('dxos.sdk.invitations-handler.guest.introduce-response', {
                invitationId: invitation.invitationId,
                ...protocol.toJSON(),
                authMethod: introductionResponse.authMethod,
              });
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
              log.verbose('dxos.sdk.invitations-handler.guest.request-admission', {
                invitationId: invitation.invitationId,
                ...protocol.toJSON(),
              });
              const admissionRequest = await protocol.createAdmissionRequest(deviceProfile);
              const admissionResponse = await extension.rpc.InvitationHostService.admit(admissionRequest);

              // Remote connection no longer needed.
              admitted = true;

              // 4. Record credential in our HALO.
              const result = await protocol.accept(admissionResponse, admissionRequest);

              // 5. Success.
              log.verbose('dxos.sdk.invitations-handler.guest.admitted-by-host', {
                invitationId: invitation.invitationId,
                ...protocol.toJSON(),
              });
              guardedState.complete({
                ...guardedState.current,
                ...result,
                state: Invitation.State.SUCCESS,
              });
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.end({ id: traceId }));
            } catch (err: any) {
              if (err instanceof TimeoutError) {
                log.verbose('timeout', { ...protocol.toJSON() });
                guardedState.set(extension, Invitation.State.TIMEOUT);
              } else {
                log.verbose('auth failed', err);
                guardedState.error(extension, err);
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
            log.verbose('timeout', { ...protocol.toJSON() });
            guardedState.set(extension, Invitation.State.TIMEOUT);
          } else {
            log.verbose('auth failed', err);
            guardedState.error(extension, err);
          }
        },
      });

      return extension;
    };

    const edgeInvitationHandler = new EdgeInvitationHandler(this._connectionProps?.edgeInvitations, this._edgeClient, {
      onInvitationSuccess: async (admissionResponse, admissionRequest) => {
        const result = await protocol.accept(admissionResponse, admissionRequest);
        log.info('admitted by edge', { ...protocol.toJSON() });
        guardedState.complete({ ...guardedState.current, ...result, state: Invitation.State.SUCCESS });
      },
    });
    edgeInvitationHandler.handle(ctx, guardedState, protocol, deviceProfile);

    scheduleTask(ctx, async () => {
      const error = checkInvitation(protocol, invitation);
      if (error) {
        stream.error(error);
        await ctx.dispose();
      } else {
        invariant(invitation.swarmKey);

        const timeoutInactive = () => {
          if (guardedState.mutex.isLocked()) {
            scheduleTask(ctx, timeoutInactive, timeout);
          } else {
            guardedState.set(null, Invitation.State.TIMEOUT);
          }
        };

        // Timeout if no connection is established.
        scheduleTask(ctx, timeoutInactive, timeout);

        await this._joinSwarm(ctx, invitation, InvitationOptions.Role.GUEST, createExtension);
        guardedState.set(null, Invitation.State.CONNECTING);
      }
    });
  }

  private async _joinSwarm(
    ctx: Context,
    invitation: Invitation,
    role: InvitationOptions.Role,
    extensionFactory: () => TeleportExtension,
  ): Promise<SwarmConnection> {
    let label: string;
    if (role === InvitationOptions.Role.GUEST) {
      label = 'invitation guest';
    } else if (invitation.kind === Invitation.Kind.DEVICE) {
      label = 'invitation host for device';
    } else {
      label = `invitation host for space ${invitation.spaceKey?.truncate()}`;
    }
    const swarmConnection = await this._networkManager.joinSwarm({
      topic: invitation.swarmKey,
      protocolProvider: createTeleportProtocolFactory(async (teleport) => {
        teleport.addExtension('dxos.halo.invitations', extensionFactory());
      }, this._connectionProps?.teleport),
      topology: new InvitationTopology(role),
      label,
    });
    ctx.onDispose(() => swarmConnection.close());
    return swarmConnection;
  }

  private async _handleGuestOtpAuth(
    extension: InvitationGuestExtension,
    setState: (newState: Invitation.State) => void,
    authenticated: Trigger<string>,
    options: { timeout: number },
  ): Promise<void> {
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
  ): Promise<void> {
    if (invitation.guestKeypair?.privateKey == null) {
      throw new Error('keypair missing in the invitation');
    }
    if (introductionResponse.challenge == null) {
      throw new Error('challenge missing in the introduction');
    }
    log('sending authentication request');
    const signature = sign(Buffer.from(introductionResponse.challenge), invitation.guestKeypair.privateKey);
    const response = await extension.rpc.InvitationHostService.authenticate({
      signedChallenge: signature,
    });
    if (response.status !== AuthenticationResponse.Status.OK) {
      throw new Error(`Authentication failed with code: ${response.status}`);
    }
  }
}

const checkInvitation = (protocol: InvitationProtocol, invitation: Partial<Invitation>) => {
  const expiresOn = getExpirationTime(invitation);
  if (expiresOn && expiresOn.getTime() < Date.now()) {
    return new InvalidInvitationError({ message: 'Invitation already expired.' });
  }
  return protocol.checkInvitation(invitation);
};

export const createAdmissionKeypair = (): AdmissionKeypair => {
  const keypair = createKeyPair();
  return { publicKey: PublicKey.from(keypair.publicKey), privateKey: keypair.secretKey };
};
