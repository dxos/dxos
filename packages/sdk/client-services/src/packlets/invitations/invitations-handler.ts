//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { PushStream, scheduleTask, sleep, TimeoutError, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitationObservable,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY,
} from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import { InvalidInvitationExtensionRoleError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse } from '@dxos/protocols/proto/dxos/halo/invitations';

import { InvitationGuestExtension, InvitationHostExtension } from './invitation-extension';
import { InvitationProtocol } from './invitation-protocol';

const MAX_OTP_ATTEMPTS = 3;

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

  createInvitation(protocol: InvitationProtocol, options?: Partial<Invitation>): CancellableInvitationObservable {
    const {
      invitationId = PublicKey.random().toHex(),
      type = Invitation.Type.INTERACTIVE,
      authMethod = Invitation.AuthMethod.SHARED_SECRET,
      state = Invitation.State.INIT,
      timeout = INVITATION_TIMEOUT,
      swarmKey = PublicKey.random(),
    } = options ?? {};
    const authCode =
      options?.authCode ??
      (authMethod === Invitation.AuthMethod.SHARED_SECRET ? generatePasscode(AUTHENTICATION_CODE_LENGTH) : undefined);
    assert(protocol);

    const invitation: Invitation = {
      invitationId,
      type,
      authMethod,
      state,
      swarmKey,
      authCode,
      timeout,
      ...protocol.getInvitationContext(),
    };

    const stream = new PushStream<Invitation>();
    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        stream.error(err);
      },
    });

    ctx.onDispose(() => {
      log('complete', { ...protocol.toJSON() });
      stream.complete();
    });

    // Called for every connecting peer.
    const createExtension = (): InvitationHostExtension => {
      const success = new Trigger<PublicKey>();
      let guestProfile: ProfileDocument | undefined;
      let authenticationPassed = false;
      let authenticationRetry = 0;

      const extension = new InvitationHostExtension({
        introduce: async ({ profile }) => {
          log('guest introduced itself', {
            guestProfile: profile,
            ...protocol.toJSON(),
          });

          guestProfile = profile;

          // TODO(dmaretskyi): Should we expose guest's profile in this callback?
          stream.next({ ...invitation, state: Invitation.State.READY_FOR_AUTHENTICATION });

          // TODO(wittjosiah): Make when the space details are revealed configurable.
          //   Spaces may want to have public details (name, member count, etc.) or hide that until guest is authed.
          return {
            spaceKey: authMethod === Invitation.AuthMethod.NONE ? protocol.getInvitationContext().spaceKey : undefined,
            authMethod,
          };
        },

        authenticate: async ({ authCode: code }) => {
          log('received authentication request', { authCode: code });
          let status = AuthenticationResponse.Status.OK;

          switch (invitation.authMethod) {
            case Invitation.AuthMethod.NONE: {
              log('authentication not required');
              return { status: AuthenticationResponse.Status.OK };
            }

            case Invitation.AuthMethod.SHARED_SECRET: {
              if (invitation.authCode) {
                if (authenticationRetry++ > MAX_OTP_ATTEMPTS) {
                  status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
                } else if (code !== invitation.authCode) {
                  status = AuthenticationResponse.Status.INVALID_OTP;
                } else {
                  authenticationPassed = true;
                }
              }
              break;
            }

            default: {
              log.error('invalid authentication method', { authMethod: invitation.authMethod });
              status = AuthenticationResponse.Status.INTERNAL_ERROR;
              break;
            }
          }

          return { status };
        },

        admit: async (admissionRequest) => {
          try {
            // Check authenticated.
            if (isAuthenticationRequired(invitation) && !authenticationPassed) {
              throw new Error('Not authenticated');
            }

            const deviceKey = admissionRequest.device?.deviceKey ?? admissionRequest.space?.deviceKey;
            assert(deviceKey);
            const admissionResponse = await protocol.admit(admissionRequest, guestProfile);

            // Updating credentials complete.
            success.wake(deviceKey);

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
              const deviceKey = await success.wait({ timeout });
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
                await sleep(ON_CLOSE_DELAY);
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

    scheduleTask(ctx, async () => {
      const topic = invitation.swarmKey!;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: topic,
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', createExtension());
        }),
        topology: new StarTopology(topic),
      });
      ctx.onDispose(() => swarmConnection.close());

      stream.next({ ...invitation, state: Invitation.State.CONNECTING });
    });

    // TODO(burdon): Stop anything pending.
    const observable = new CancellableInvitationObservable({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...invitation, state: Invitation.State.CANCELLED });
        await ctx.dispose();
      },
    });

    return observable;
  }

  acceptInvitation(protocol: InvitationProtocol, invitation: Invitation): AuthenticatingInvitationObservable {
    const { timeout = INVITATION_TIMEOUT } = invitation;
    assert(protocol);

    const authenticated = new Trigger<string>();

    let currentState: Invitation.State;
    const stream = new PushStream<Invitation>();
    const setState = (newData: Partial<Invitation>) => {
      assert(newData.state !== undefined);
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
            if (currentState !== Invitation.State.SUCCESS) {
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
              if (introductionResponse.spaceKey) {
                invitation.spaceKey = introductionResponse.spaceKey;
              }

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
              } else {
                // Notify that introduction is complete even if auth is not required.
                setState({ state: Invitation.State.READY_FOR_AUTHENTICATION });
              }

              // 3. Send admission credentials to host (with local space keys).
              log('request admission', { ...protocol.toJSON() });
              const admissionRequest = await protocol.createAdmissionRequest();
              const admissionResponse = await extension.rpc.InvitationHostService.admit(admissionRequest);

              // 4. Record credential in our HALO.
              const result = await protocol.accept(admissionResponse, admissionRequest);

              // 5. Success.
              log('admitted by host', { ...protocol.toJSON() });
              setState({ ...result, state: Invitation.State.SUCCESS });
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
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: PublicKey.random(),
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', createExtension());
        }),
        topology: new StarTopology(topic),
      });
      ctx.onDispose(() => swarmConnection.close());

      setState({ state: Invitation.State.CONNECTING });
    });

    const observable = new AuthenticatingInvitationObservable({
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

const isAuthenticationRequired = (invitation: Invitation) => invitation.authMethod !== Invitation.AuthMethod.NONE;
