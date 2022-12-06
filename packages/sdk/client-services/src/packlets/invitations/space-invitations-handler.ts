//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { sleep, Trigger } from '@dxos/async';
import { createAdmissionCredentials, generatePasscode } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  adaptProtocolProvider,
  createProtocolFactory,
  NetworkManager,
  StarTopology,
  SwarmConnection
} from '@dxos/network-manager';
import { createRpcPlugin, RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse } from '@dxos/protocols/proto/dxos/halo/invitations';
import { createProtoRpcPeer } from '@dxos/rpc';

import {
  AuthenticatingInvitationProvider,
  CancellableInvitationObservable,
  InvitationObservableProvider,
  AUTHENTICATION_CODE_LENGTH,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY
} from './invitations';
import { AbstractInvitationsHandler, InvitationsOptions } from './invitations-handler';

const MAX_OTP_ATTEMPTS = 3;

/**
 * Handles the life-cycle of Space invitations between peers.
 */
// TODO(dmaretskyi): Split into Host and Guest parts.
export class SpaceInvitationsHandler extends AbstractInvitationsHandler<Space> {
  constructor(
    networkManager: NetworkManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _signingContext: SigningContext
  ) {
    super(networkManager);
  }

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(space: Space, options?: InvitationsOptions): CancellableInvitationObservable {
    let swarmConnection: SwarmConnection | undefined;
    const { type, timeout = INVITATION_TIMEOUT, swarmKey } = options ?? {};
    assert(type !== Invitation.Type.OFFLINE);
    assert(space);

    const invitation: Invitation = {
      type,
      invitationId: PublicKey.random().toHex(),
      swarmKey: swarmKey ?? PublicKey.random(),
      spaceKey: space.key,
      authenticationCode: generatePasscode(AUTHENTICATION_CODE_LENGTH)
    };

    // TODO(burdon): Stop anything pending.
    const observable = new InvitationObservableProvider(async () => {
      await swarmConnection?.close();
    });

    let authenticationCode: string;
    let authenticationRetry = 0;

    const complete = new Trigger<PublicKey>();
    const plugin = new RpcPlugin(async (port) => {
      let guestProfile: ProfileDocument | undefined;

      const peer = createProtoRpcPeer({
        exposed: {
          // TODO(burdon): Reconcile with client/services.
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        handlers: {
          SpaceHostService: {
            requestAdmission: async ({ profile }) => {
              log('responding with admission offer', {
                guestProfile: profile,
                host: this._signingContext.deviceKey,
                spaceKey: space.key
              });

              guestProfile = profile;

              // TODO(burdon): Is this the right place to set this state?
              // TODO(dmaretskyi): Should we expose guest's profile in this callback?
              observable.callback.onAuthenticating?.(invitation);
              return {
                spaceKey: space.key,
                genesisFeedKey: space.genesisFeedKey
              };
            },

            authenticate: async ({ authenticationCode: code }) => {
              log('received authentication request', { authenticationCode: code });
              let status = AuthenticationResponse.Status.OK;
              if (invitation.authenticationCode) {
                if (authenticationRetry++ > MAX_OTP_ATTEMPTS) {
                  status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
                } else if (code !== invitation.authenticationCode) {
                  status = AuthenticationResponse.Status.INVALID_OTP;
                } else {
                  authenticationCode = code;
                }
              }

              return { status };
            },

            presentAdmissionCredentials: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
              try {
                // Check authenticated.
                if (invitation.type !== Invitation.Type.INTERACTIVE_TESTING) {
                  if (
                    invitation.authenticationCode === undefined ||
                    invitation.authenticationCode !== authenticationCode
                  ) {
                    throw new Error(`invalid authentication code: ${authenticationCode}`);
                  }
                }

                log('writing guest credentials', { host: this._signingContext.deviceKey, guest: deviceKey });
                // TODO(burdon): Check if already admitted.
                await writeMessages(
                  space.controlPipeline.writer,
                  await createAdmissionCredentials(
                    this._signingContext.credentialSigner,
                    identityKey,
                    deviceKey,
                    space.key,
                    controlFeedKey,
                    dataFeedKey,
                    guestProfile
                  )
                );

                // Updating credentials complete.
                complete.wake(deviceKey);
              } catch (err) {
                // TODO(burdon): Generic RPC callback to report error to client.
                observable.callback.onError(err);
                throw err; // Propagate error to guest.
              }
            }
          }
        },
        port
      });

      try {
        await peer.open();
        log('connected', { host: this._signingContext.deviceKey });
        observable.callback.onConnected?.(invitation);
        const deviceKey = await complete.wait({ timeout });
        log('admitted guest', { host: this._signingContext.deviceKey, guest: deviceKey });
        observable.callback.onSuccess(invitation);
      } catch (err) {
        if (!observable.cancelled) {
          log.error('failed', err);
          observable.callback.onError(err);
        }
      } finally {
        await sleep(ON_CLOSE_DELAY);
        await peer.close();
        await swarmConnection!.close();
      }
    });

    setTimeout(async () => {
      const topic = invitation.swarmKey!;
      const peerId = PublicKey.random(); // Use anonymous key.
      swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: topic,
        protocolProvider: adaptProtocolProvider(createProtocolFactory(topic, peerId, [plugin])),
        topology: new StarTopology(topic)
      });

      observable.callback.onConnecting?.(invitation);
    });

    return observable;
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local space invitation to the host,
   * which then writes the guest's credentials to the space.
   */
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationProvider {
    const { timeout = INVITATION_TIMEOUT } = options ?? {};
    let swarmConnection: SwarmConnection | undefined;

    const authenticated = new Trigger<string>();
    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        await swarmConnection?.close();
      },

      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Event?
        authenticated.wake(code);
      }
    });

    let connectionCount = 0;
    const complete = new Trigger();
    const plugin = createRpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        requested: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        port
      });

      try {
        await peer.open();
        // TODO(burdon): Bug where guest may create multiple connections (does teleport fix this?)
        if (++connectionCount > 1) {
          throw new Error(`multiple connections detected: ${connectionCount}`);
        }

        log('connected', { guest: this._signingContext.deviceKey });
        observable.callback.onConnected?.(invitation);

        // 1. Send request.
        log('sending admission request', { guest: this._signingContext.deviceKey });
        const { spaceKey, genesisFeedKey } = await peer.rpc.SpaceHostService.requestAdmission({
          profile: this._signingContext.profile
        });

        // 2. Get authentication code.
        // TODO(burdon): Test timeout (options for timeouts at different steps).
        if (invitation.type === undefined || invitation.type === Invitation.Type.INTERACTIVE) {
          for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
            log('guest waiting for authentication code...');
            observable.callback.onAuthenticating?.(invitation);
            const authenticationCode = await authenticated.wait({ timeout });

            log('sending authentication request');
            const response = await peer.rpc.SpaceHostService.authenticate({ authenticationCode });
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

        // 3. Create local space.
        // TODO(burdon): Abandon if does not complete (otherwise retry will fail).
        const space = await this._spaceManager.acceptSpace({ spaceKey, genesisFeedKey });

        // 4. Send admission credentials to host (with local space keys).
        log('presenting admission credentials', { guest: this._signingContext.deviceKey, spaceKey: space.key });
        await peer.rpc.SpaceHostService.presentAdmissionCredentials({
          identityKey: this._signingContext.identityKey,
          deviceKey: this._signingContext.deviceKey,
          controlFeedKey: space.controlFeedKey,
          dataFeedKey: space.dataFeedKey
        });

        // 5. Success.
        log('admitted by host', { guest: this._signingContext.deviceKey, spaceKey: space.key });
        complete.wake();
      } catch (err) {
        if (!observable.cancelled) {
          log.warn('auth failed', err);
          observable.callback.onError(err);
        }
      } finally {
        await peer.close();
      }
    });

    setTimeout(async () => {
      assert(invitation.swarmKey);
      assert(!invitation.invitationId);
      invitation.invitationId = PublicKey.random().toHex();

      const topic = invitation.swarmKey;
      const peerId = PublicKey.random(); // Use anonymous key.
      swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: PublicKey.random(),
        protocolProvider: adaptProtocolProvider(createProtocolFactory(topic, peerId, [plugin])),
        topology: new StarTopology(topic)
      });

      observable.callback.onConnecting?.(invitation);
      await complete.wait();
      observable.callback.onSuccess(invitation);
      await swarmConnection.close();
    });

    return observable;
  }
}
