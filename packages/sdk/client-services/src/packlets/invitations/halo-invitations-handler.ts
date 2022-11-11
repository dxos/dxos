//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { sleep, Trigger } from '@dxos/async';
import { generatePasscode } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { createRpcPlugin, RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer } from '@dxos/rpc';

import { IdentityManager } from '../identity';
import {
  AuthenticatingInvitationProvider,
  CreateInvitationsOptions,
  InvitationsHandler,
  InvitationObservable,
  InvitationObservableProvider,
  AUTHENTICATION_CODE_LENGTH,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY
} from './invitations';

// TODO(burdon): Factor out commonality with SpaceInvitationsHandler.

/**
 * Handles the life-cycle of Halo invitations between peers.
 */
export class HaloInvitationsHandler implements InvitationsHandler<void> {
  // prettier-ignore
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _networkManager: NetworkManager
  ) {}

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(_: void, options?: CreateInvitationsOptions): InvitationObservable {
    let swarmConnection: SwarmConnection | undefined;
    const { type, timeout = INVITATION_TIMEOUT } = options ?? {};
    assert(type !== Invitation.Type.OFFLINE);
    const identity = this._identityManager.identity ?? failUndefined();
    const signingContext = identity.getIdentityCredentialSigner();

    const invitation: Invitation = {
      type,
      invitationId: PublicKey.random().toHex(),
      swarmKey: PublicKey.random(),
      authenticationCode: generatePasscode(AUTHENTICATION_CODE_LENGTH)
    };

    // TODO(burdon): Stop anything pending.
    const observable = new InvitationObservableProvider(async () => {
      await swarmConnection?.close();
    });

    let authenticationCode: string;
    const complete = new Trigger<PublicKey>();
    const plugin = new RpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        exposed: {
          HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
        },
        handlers: {
          HaloHostService: {
            requestAdmission: async () => {
              log('responding with admission offer', {
                host: signingContext.deviceKey
              });

              // TODO(burdon): Is this the right place to set this state?
              observable.callback.onAuthenticating?.(invitation);
              return {
                identityKey: identity.identityKey,
                haloSpaceKey: identity.haloSpaceKey,
                genesisFeedKey: identity.haloGenesisFeedKey
              };
            },

            authenticate: async ({ authenticationCode: code }) => {
              log('received authentication request', { authenticationCode: code });
              authenticationCode = code;
            },

            presentAdmissionCredentials: async ({ deviceKey, controlFeedKey, dataFeedKey }) => {
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
                const signer = identity.getIdentityCredentialSigner();
                await writeMessages(identity.controlPipeline.writer, [
                  {
                    // TODO(burdon): Use credential generator.
                    '@type': 'dxos.echo.feed.CredentialsMessage',
                    credential: await signer.createCredential({
                      subject: deviceKey,
                      assertion: {
                        '@type': 'dxos.halo.credentials.AuthorizedDevice',
                        identityKey: identity.identityKey,
                        deviceKey
                      }
                    })
                  }
                ]);

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
        log('connected', { host: signingContext.deviceKey });
        observable.callback.onConnected?.(invitation);
        const deviceKey = await complete.wait({ timeout });
        log('admitted guest', { host: signingContext.deviceKey, guest: deviceKey });
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
   * The local guest peer (invitee) then sends the local halo invitation to the host,
   * which then writes the guest's credentials to the halo.
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
          HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
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
        const { identityKey, haloSpaceKey, genesisFeedKey } = await peer.rpc.HaloHostService.requestAdmission();

        // 2. Get authentication code.
        // TODO(burdon): Test timeout (options for timeouts at different steps).
        if (invitation.type === undefined || invitation.type === Invitation.Type.INTERACTIVE) {
          log('waiting for authentication code...');
          observable.callback.onAuthenticating?.(invitation);
          const authenticationCode = await authenticated.wait({ timeout: INVITATION_TIMEOUT });
          log('sending authentication request');
          await peer.rpc.HaloHostService.authenticate({ authenticationCode });
        }

        // 3. Create local identity.
        // TODO(burdon): Abandon if does not complete (otherwise retry will fail).
        const identity = await this._identityManager.acceptIdentity({
          identityKey,
          haloSpaceKey,
          haloGenesisFeedKey: genesisFeedKey
        });

        // 4. Send admission credentials to host (with local identity keys).
        log('presenting admission credentials', { guest: this._signingContext.deviceKey, identityKey });
        await peer.rpc.HaloHostService.presentAdmissionCredentials({
          deviceKey: identity.deviceKey,
          controlFeedKey: PublicKey.random(),
          dataFeedKey: PublicKey.random()
        });

        // 5. Success.
        log('admitted by host', { guest: this._signingContext.deviceKey, identityKey });
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
