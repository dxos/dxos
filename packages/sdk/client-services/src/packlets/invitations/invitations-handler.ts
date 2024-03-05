//
// Copyright 2022 DXOS.org
//

import { PushStream, scheduleTask, TimeoutError, Trigger } from '@dxos/async';
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
import {
  createTeleportProtocolFactory,
  type NetworkManager,
  StarTopology,
  type SwarmConnection,
} from '@dxos/network-manager';
import { InvalidInvitationExtensionRoleError, trace } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse } from '@dxos/protocols/proto/dxos/halo/invitations';

import {
  InvitationGuestExtension,
  InvitationHostExtension,
  isAuthenticationRequired,
  MAX_OTP_ATTEMPTS,
} from './invitation-extension';
import { type InvitationProtocol } from './invitation-protocol';

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

  createInvitation(protocol: InvitationProtocol, options?: Partial<Invitation>): CancellableInvitation {
    const {
      invitationId = PublicKey.random().toHex(),
      type = Invitation.Type.INTERACTIVE,
      authMethod = Invitation.AuthMethod.SHARED_SECRET,
      state = Invitation.State.INIT,
      timeout = INVITATION_TIMEOUT,
      swarmKey = PublicKey.random(),
      persistent = true,
      lifetime = 86400, // 1 day
    } = options ?? {};
    const authCode =
      options?.authCode ??
      (authMethod === Invitation.AuthMethod.SHARED_SECRET ? generatePasscode(AUTHENTICATION_CODE_LENGTH) : undefined);
    invariant(protocol);

    const invitation: Invitation = {
      invitationId,
      type,
      authMethod,
      state,
      swarmKey,
      authCode,
      timeout,
      persistent,
      lifetime,
      ...protocol.getInvitationContext(),
    };

    const stream = new PushStream<Invitation>();
    const ctx = new Context({
      onError: (err) => {
        stream.error(err);
        void ctx.dispose();
      },
    });

    ctx.onDispose(() => {
      log('complete', { ...protocol.toJSON() });
      stream.complete();
    });

    // Called for every connecting peer.
    const createExtension = (): InvitationHostExtension => {
      const extension = new InvitationHostExtension({
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
            const admissionResponse = await protocol.admit(admissionRequest, extension.guestProfile);

            // Updating credentials complete.
            extension.completedTrigger.wake(deviceKey);

            return admissionResponse;
          } catch (err: any) {
            // TODO(burdon): Generic RPC callback to report error to client.
            stream.error(err);
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
              const deviceKey = await extension.completedTrigger.wait({ timeout });
              log('admitted guest', { guest: deviceKey, ...protocol.toJSON() });
              stream.next({ ...invitation, state: Invitation.State.SUCCESS });
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.end({ id: traceId }));
            } catch (err: any) {
              if (err instanceof TimeoutError) {
                log('timeout', { ...protocol.toJSON() });
                stream.next({ ...invitation, state: Invitation.State.TIMEOUT });
              } else {
                log.error('failed', err);
                stream.error(err);
              }
              log.trace('dxos.sdk.invitations-handler.host.onOpen', trace.error({ id: traceId, error: err }));
            } finally {
              if (type !== Invitation.Type.MULTIUSE) {
                // Wait for graceful close before disposing.
                await swarmConnection.close();
                await ctx.dispose();
              }
            }
          });
        },
        onError: (err) => {
          if (err instanceof InvalidInvitationExtensionRoleError) {
            return;
          }
          if (err instanceof TimeoutError) {
            log('timeout', { ...protocol.toJSON() });
            stream.next({ ...invitation, state: Invitation.State.TIMEOUT });
          } else {
            log.error('failed', err);
            stream.error(err);
          }
        },
      });

      return extension;
    };

    let swarmConnection: SwarmConnection;

    // TODO(nf): cancel invitations when the persistence deadline is reached.
    // TODO(nf): honor some deadline for non-persistent invitations as well?

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
        topology: new StarTopology(topic),
        label: invitationLabel,
      });
      ctx.onDispose(() => swarmConnection.close());

      stream.next({ ...invitation, state: Invitation.State.CONNECTING });
    });

    // TODO(burdon): Stop anything pending.
    const observable = new CancellableInvitation({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...invitation, state: Invitation.State.CANCELLED });
        await ctx.dispose();
      },
    });

    return observable;
  }

  acceptInvitation(
    protocol: InvitationProtocol,
    invitation: Invitation,
    deviceProfile?: DeviceProfileDocument,
  ): AuthenticatingInvitation {
    const { timeout = INVITATION_TIMEOUT } = invitation;
    invariant(protocol);

    // TODO(nf): duplicate check in InvitationsService
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
          stream.error(err);
        }
        void ctx.dispose();
      },
    });

    ctx.onDispose(() => {
      log('complete', { ...protocol.toJSON() });
      stream.complete();
    });

    const createExtension = (): InvitationGuestExtension => {
      let connectionCount = 0;

      const extension = new InvitationGuestExtension({
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
              // TODO(burdon): Bug where guest may create multiple connections.
              if (++connectionCount > 1) {
                throw new Error(`multiple connections detected: ${connectionCount}`);
              }

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
                for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
                  log('guest waiting for authentication code...');
                  setState({ state: Invitation.State.READY_FOR_AUTHENTICATION });
                  const authCode = await authenticated.wait({ timeout });

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
                stream.error(err);
              }
              log.trace('dxos.sdk.invitations-handler.guest.onOpen', trace.error({ id: traceId, error: err }));
            } finally {
              await ctx.dispose();
            }
          });
        },
        onError: (err) => {
          if (err instanceof InvalidInvitationExtensionRoleError) {
            return;
          }
          if (err instanceof TimeoutError) {
            log('timeout', { ...protocol.toJSON() });
            setState({ state: Invitation.State.TIMEOUT });
          } else {
            log('auth failed', err);
            stream.error(err);
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
          topology: new StarTopology(topic),
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
}

export const invitationExpired = (invitation: Invitation) => {
  return (
    invitation.created &&
    invitation.lifetime &&
    invitation.lifetime !== 0 &&
    invitation.created.getTime() + invitation.lifetime < Date.now()
  );
};
