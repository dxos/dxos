//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, CancellableObservableProvider, sleep, Trigger } from '@dxos/async';
import { createAdmissionCredentials } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { createRpcPlugin, RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer } from '@dxos/rpc';

import { InvitationEvents, InvitationsHandler } from './invitations';

/**
 * Handles the life-cycle of Space invitations between peers.
 *
 *
 * Host
 * - Creates an invitation containing a swarm topic.
 * - Joins the swarm with the topic and waits for guest's admission request.
 * - Responds with admission offer then waits for guest's credentials.
 * - Writes credentials to control feed then exits.
 *
 * Guest
 * - Joins the swarm with the topic.
 * - NOTE: The topic is transmitted out-of-band (e.g., via a QR code).
 * - Sends an admission request.
 * - Creates a local cloned space (with genesis block).
 * - Sends admission credentials (containing local device and feed keys).
 *
 * [Guest]                              [Host]
 *  |-----------------RequestAdmission-->|
 *  |<--AdmissionOffer-------------------|
 *  |
 *  |------PresentAdmissionCredentials-->|
 *
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
  createInvitation(space: Space): CancellableObservable<InvitationEvents> {
    let swarmConnection: SwarmConnection | undefined;

    const topic = PublicKey.random();
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      swarmKey: topic,
      spaceKey: space.key
    };

    // TODO(burdon): Stop anything pending.
    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      await swarmConnection?.close();
    });

    const complete = new Trigger<PublicKey>();
    const plugin = new RpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        exposed: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        handlers: {
          SpaceHostService: {
            // TODO(burdon): Send PIN.
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

            presentAdmissionCredentials: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
              try {
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
        log('host connected', { host: this._signingContext.deviceKey });
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
  acceptInvitation(invitation: Invitation): CancellableObservable<InvitationEvents> {
    let swarmConnection: SwarmConnection | undefined;

    // TODO(burdon): Callback for OTP, ec.
    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      await swarmConnection?.close();
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

        // 2. Create local space.
        // TODO(burdon): Abandon if does not complete (otherwise retry will fail).
        const space = await this._spaceManager.acceptSpace({ spaceKey, genesisFeedKey });

        // 3. Send admission credentials to host (with local space keys).
        log('presenting admission credentials', { guest: this._signingContext.deviceKey, spaceKey: space.key });
        await peer.rpc.SpaceHostService.presentAdmissionCredentials({
          identityKey: this._signingContext.identityKey,
          deviceKey: this._signingContext.deviceKey,
          controlFeedKey: space.controlFeedKey,
          dataFeedKey: space.dataFeedKey
        });

        // 4. Success.
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
