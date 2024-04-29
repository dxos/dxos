//
// Copyright 2022 DXOS.org
//

import { Mutex, PushStream, scheduleTask, TimeoutError, Trigger } from '@dxos/async';
import { AuthenticatingInvitation, INVITATION_TIMEOUT } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
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

import { InvitationGuestExtension } from './invitation-guest-extenstion';
import { InvitationHostExtension, isAuthenticationRequired, MAX_OTP_ATTEMPTS } from './invitation-host-extension';
import { type InvitationProtocol } from './invitation-protocol';
import { InvitationTopology } from './invitation-topology';

/**
 * Generic handler for Halo and Space invitations.
 * Handles the life-cycle of invitations between peers.
 *
 * Host
 * - Creates an invitation containing a swarm topic (which can be shared via a URL, QR code, or direct message).
 * - Joins the swarm with the topic and waits for guest's introduction.
 * - Wait for guest to authenticate with OTP.
 * - Waits for guest to present credentials (containing local device and feed keys).
 * - Writes credentials to control feed then exits.
 *
 * Guest
 * - Joins the swarm with the topic.
 * - Sends an introduction.
 * - Sends authentication OTP.
 * - If Space handler then creates a local cloned space (with genesis block).
 * - Sends admission credentials.
 *
 * TODO(burdon): Show proxy/service relationship and reference design doc/diagram.
 *
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
  constructor(private readonly _networkManager: NetworkManager) {}

  handleInvitationFlow(
    ctx: Context,
    stream: PushStream<Invitation>,
    protocol: InvitationProtocol,
    invitation: Invitation,
  ): void {
    const topology = new InvitationTopology(Options.Role.HOST);
    const invitationFlowMutex = new Mutex();
    // Called for every connecting peer.
    const createExtension = (): InvitationHostExtension => {
      const extension = new InvitationHostExtension(invitationFlowMutex, {
        onStateUpdate: (invitation) => {
          stream.next({ ...invitation, state: Invitation.State.READY_FOR_AUTHENTICATION });
        },

        resolveInvitation: async ({ invitationId }) => {
          if (invitationId && invitationId !== invitation.invitationId) {
            return undefined;
          }
          return invitation;
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
            stream.next({ ...invitation, state: Invitation.State.ERROR });
            throw err; // Propagate error to guest.
          }
        },

        onOpen: () => {
          scheduleTask(ctx, async () => {
            const traceId = PublicKey.random().toHex();
            try {
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.begin({ id: traceId }));
              log('connected', { ...protocol.toJSON() });
              stream.next({ ...invitation, state: Invitation.State.CONNECTED });
              const deviceKey = await extension.completedTrigger.wait({ timeout: invitation.timeout });
              log('admitted guest', { guest: deviceKey, ...protocol.toJSON() });
              stream.next({ ...invitation, state: Invitation.State.SUCCESS });
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.end({ id: traceId }));
            } catch (err: any) {
              if (err instanceof TimeoutError) {
                log('timeout', { ...protocol.toJSON() });
                stream.next({ ...invitation, state: Invitation.State.TIMEOUT });
              } else {
                log.error('failed', err);
                stream.next({ ...invitation, state: Invitation.State.ERROR });
              }
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.error({ id: traceId, error: err }));
              // Close connection
              throw err;
            } finally {
              if (!invitation.multiUse) {
                // Wait for graceful close before disposing.
                await swarmConnection.close();
                await ctx.dispose();
              }
            }
          });
        },
        onError: (err) => {
          if (err instanceof InvalidInvitationExtensionRoleError) {
            invariant(err.context?.remotePeerId);
            topology.addWrongRolePeer(err.context.remotePeerId);
            return;
          }
          if (err instanceof TimeoutError) {
            log('timeout', { ...protocol.toJSON() });
            stream.next({ ...invitation, state: Invitation.State.TIMEOUT });
          } else {
            log.error('failed', err);
            stream.next({ ...invitation, state: Invitation.State.ERROR });
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
            stream.next({ ...invitation, state: Invitation.State.EXPIRED });
            await ctx.dispose();
          },
          invitation.created.getTime() + invitation.lifetime * 1000 - Date.now(),
        );
      }
    }

    let swarmConnection: SwarmConnection;
    const invitationLabel =
      'invitation host for ' +
      (invitation.kind === Invitation.Kind.DEVICE ? 'device' : `space ${invitation.spaceKey?.truncate()}`);
    scheduleTask(ctx, async () => {
      const topic = invitation.swarmKey!;
      swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: topic,
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', createExtension());
        }),
        topology,
        label: invitationLabel,
      });
      ctx.onDispose(() => swarmConnection.close());

      stream.next({ ...invitation, state: Invitation.State.CONNECTING });
    });
  }

  acceptInvitation(
    protocol: InvitationProtocol,
    invitation: Invitation,
    deviceProfile?: DeviceProfileDocument,
  ): AuthenticatingInvitation {
    const { timeout = INVITATION_TIMEOUT } = invitation;

    if (deviceProfile) {
      invariant(invitation.kind === Invitation.Kind.DEVICE, 'deviceProfile provided for non-device invitation');
    }
    const authenticated = new Trigger<string>();

    // TODO(dmaretskyi): Turn into state?
    // Whether the Host has already admitted us and the remote connection is no longer needed.
    let admitted = false;

    let currentState: Invitation.State;
    const stream = new PushStream<Invitation>();
    const setState = (newData: Partial<Invitation>) => {
      invariant(newData.state !== undefined);
      currentState = newData.state;
      stream.next({ ...invitation, ...newData });
    };

    const ctx = new Context({
      onError: (err) => {
        if (err instanceof TimeoutError) {
          log('timeout', { ...protocol.toJSON() });
          setState({ state: Invitation.State.TIMEOUT });
        } else {
          log.warn('auth failed', err);
          setState({ state: Invitation.State.ERROR });
        }
        void ctx.dispose();
      },
    });

    ctx.onDispose(() => {
      log('complete', { ...protocol.toJSON() });
      stream.complete();
    });

    const topology = new InvitationTopology(Options.Role.GUEST);

    const invitationFlowMutex = new Mutex();
    const createExtension = (): InvitationGuestExtension => {
      const connectionCount = 0;

      const extension = new InvitationGuestExtension(invitationFlowMutex, {
        onOpen: (extensionCtx) => {
          extensionCtx.onDispose(async () => {
            log('extension disposed', { currentState });
            if (!admitted) {
              stream.error(new Error('Remote peer disconnected.'));
            }
          });

          scheduleTask(ctx, async () => {
            const traceId = PublicKey.random().toHex();
            try {
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.begin({ id: traceId }));

              scheduleTask(ctx, () => ctx.raise(new TimeoutError(timeout)), timeout);

              log('connected', { ...protocol.toJSON() });
              setState({ state: Invitation.State.CONNECTED });

              // 1. Introduce guest to host.
              log('introduce', { ...protocol.toJSON() });
              const introductionResponse = await extension.rpc.InvitationHostService.introduce(
                protocol.createIntroduction(),
              );
              log('introduce response', { ...protocol.toJSON(), response: introductionResponse });
              invitation.authMethod = introductionResponse.authMethod;

              // 2. Get authentication code.
              if (isAuthenticationRequired(invitation)) {
                switch (invitation.authMethod) {
                  case Invitation.AuthMethod.SHARED_SECRET:
                    await this._handleGuestOtpAuth(extension, setState, authenticated, { timeout });
                    break;
                  case Invitation.AuthMethod.KNOWN_PUBLIC_KEY:
                    await this._handleGuestKpkAuth(extension, setState, invitation, introductionResponse);
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
              setState({ ...result, target: invitation.target, state: Invitation.State.SUCCESS });
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.end({ id: traceId }));
            } catch (err: any) {
              if (err instanceof TimeoutError) {
                log('timeout', { ...protocol.toJSON() });
                setState({ state: Invitation.State.TIMEOUT });
              } else {
                log('auth failed', err);
                setState({ state: Invitation.State.ERROR });
              }
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.error({ id: traceId, error: err }));
            } finally {
              await ctx.dispose();
            }
          });
        },
        onError: (err) => {
          if (err instanceof InvalidInvitationExtensionRoleError) {
            invariant(err.context?.remotePeerId);
            topology.addWrongRolePeer(err.context.remotePeerId);
            return;
          }
          if (err instanceof TimeoutError) {
            log('timeout', { ...protocol.toJSON() });
            setState({ state: Invitation.State.TIMEOUT });
          } else {
            log('auth failed', err);
            setState({ state: Invitation.State.ERROR });
          }
        },
      });

      return extension;
    };

    scheduleTask(ctx, async () => {
      const error = protocol.checkInvitation(invitation);
      if (error) {
        stream.error(error);
      } else {
        invariant(invitation.swarmKey);
        const topic = invitation.swarmKey;
        const swarmConnection = await this._networkManager.joinSwarm({
          topic,
          peerId: PublicKey.random(),
          protocolProvider: createTeleportProtocolFactory(async (teleport) => {
            teleport.addExtension('dxos.halo.invitations', createExtension());
          }),
          topology,
          label: 'invitation guest',
        });
        ctx.onDispose(() => swarmConnection.close());

        setState({ state: Invitation.State.CONNECTING });
      }
    });

    const observable = new AuthenticatingInvitation({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        setState({ state: Invitation.State.CANCELLED });
        await ctx.dispose();
      },
      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Event?
        authenticated.wake(code);
      },
    });

    return observable;
  }

  private async _handleGuestOtpAuth(
    extension: InvitationGuestExtension,
    setState: (newState: Partial<Invitation>) => void,
    authenticated: Trigger<string>,
    options: { timeout: number },
  ) {
    for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
      log('guest waiting for authentication code...');
      setState({ state: Invitation.State.READY_FOR_AUTHENTICATION });
      const authCode = await authenticated.wait(options);

      log('sending authentication request');
      setState({ state: Invitation.State.AUTHENTICATING });
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
    setState: (newState: Partial<Invitation>) => void,
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
    setState({ state: Invitation.State.AUTHENTICATING });
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
