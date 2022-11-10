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
import { createProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { createRpcPlugin, RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer } from '@dxos/rpc';

import {
  AuthenticatingInvitationProvider,
  InvitationsHandler,
  InvitationObservable,
  ObservableInvitationProvider
} from './invitations';

/**
 * Handles the life-cycle of Space invitations between peers.
 */
export class SpaceInvitationsHandler implements InvitationsHandler<Space> {
  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext
  ) {}

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(space: Space): InvitationObservable {
    let swarmConnection: SwarmConnection | undefined;

    const topic = PublicKey.random();
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      swarmKey: topic,
      spaceKey: space.key,
      authenticationCode: generatePasscode(6)
    };

    // TODO(burdon): Stop anything pending.
    const observable = new ObservableInvitationProvider(async () => {
      await swarmConnection?.close();
    });

    let authenticationCode: string;
    const complete = new Trigger<PublicKey>();
    const plugin = new RpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        exposed: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        handlers: {
          SpaceHostService: {
            requestAdmission: async () => {
              log('responding with admission offer', {
                host: this._signingContext.deviceKey,
                spaceKey: space.key
              });
              return {
                spaceKey: space.key,
                genesisFeedKey: space.genesisFeedKey
              };
            },

            authenticate: async ({ authenticationCode: code }) => {
              log('received authentication request', { authenticationCode: code });
              authenticationCode = code;
            },

            presentAdmissionCredentials: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
              try {
                // Check authenticated.
                if (invitation.type === undefined || invitation.type === Invitation.Type.INTERACTIVE) {
                  if (
                    invitation.authenticationCode === undefined ||
                    authenticationCode !== invitation.authenticationCode
                  ) {
                    throw new Error('authentication code not set');
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
                    dataFeedKey
                  )
                );

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
        const deviceKey = await complete.wait(); // TODO(burdon): Timeout.
        log('admitted guest', { host: this._signingContext.deviceKey, guest: deviceKey });
        observable.callback.onSuccess(invitation);
      } catch (err) {
        if (!observable.cancelled) {
          log.error('failed', err);
          observable.callback.onError(err);
        }
      } finally {
        await sleep(100); // TODO(burdon): Don't close until RPC has complete.
        await peer.close();
        await swarmConnection!.close();
      }
    });

    setTimeout(async () => {
      const peerId = PublicKey.random(); // Use anonymous key.
      swarmConnection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: topic,
        protocol: createProtocolFactory(topic, peerId, [plugin]),
        topology: new StarTopology(topic)
      });

      observable.callback.onConnecting?.(invitation);
    });

    return observable;
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local party invitation to the host,
   * which then writes the guest's credentials to the space.
   */
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationProvider {
    let swarmConnection: SwarmConnection | undefined;

    const authenticated = new Trigger<string>();
    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        await swarmConnection?.close();
      },

      // TODO(burdon): Consider retry.
      onAuthenticate: async (code: string) => {
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
        // TODO(burdon): Bug where guest may create multiple connections.
        if (++connectionCount > 1) {
          throw new Error(`multiple connections detected: ${connectionCount}`);
        }

        log('connected', { guest: this._signingContext.deviceKey });
        observable.callback.onConnected?.(invitation);

        // 1. Send request.
        log('sending admission request', { guest: this._signingContext.deviceKey });
        const { spaceKey, genesisFeedKey } = await peer.rpc.SpaceHostService.requestAdmission();

        // 2. Get authentication code.
        // TODO(burdon): Test timeout (options for timeouts at different steps).
        if (invitation.type === undefined || invitation.type === Invitation.Type.INTERACTIVE) {
          log('waiting for authentication code...');
          observable.callback.onAuthenticating?.(invitation);
          const authenticationCode = await authenticated.wait();
          log('sending authentication request');
          await peer.rpc.SpaceHostService.authenticate({ authenticationCode });
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
          log.warn('failed', err);
          observable.callback.onError(err);
        }
      } finally {
        await peer.close();
      }
    });

    setTimeout(async () => {
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      const peerId = PublicKey.random(); // Use anonymous key.
      swarmConnection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: PublicKey.random(),
        protocol: createProtocolFactory(topic, peerId, [plugin]),
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
