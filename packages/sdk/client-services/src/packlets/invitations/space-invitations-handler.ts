//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, CancellableObservableProvider, observableError, sleep, Trigger } from '@dxos/async';
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
 * Host
 * - Creates an invitation containing the swarm topic (rendezvous key, which can be passed out-of-band to the guest).
 * - Joins the swarm with this topic.
 * - Once connected to guest, send the admission offer (e.g., space keys).
 * - Listen for guest's credentials presentation (e.g., device key) then write credentials to the feed.
 *
 *  TODO(burdon): Update (see below).
 *  [Client] => SpaceInvitationProxy.createInvitation(): Observable
 *    <RPC:InvitationsService>
 *      SpaceInvitationsService => SpaceInvitations.createInvitation(): Observable
 *        SpaceGuestService.presentAdmissionOffer()
 *          [SpaceHostService.presentAdmissionCredentials] => write credentials.
 *
 * Guest
 * - Joins the swarm with the topic encoded in the invitation.
 * - Listens for the hosts' admission offer.
 * - Responds with credentials presentation.
 *
 * [Client] => SpaceInvitationProxy.acceptInvitation(): Observable
 *    <RPC:InvitationsService>
 *      SpaceInvitationsService => SpaceInvitations.acceptInvitation(): Observable
 *        [SpaceGuestService.presentAdmissionOffer] => SpaceHostService.presentAdmissionCredentials()
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

    let count = 0;
    const complete = new Trigger();
    const plugin = new RpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        exposed: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        handlers: {
          SpaceHostService: {
            requestAdmission: async () => {
              log('responding with admission offer', { spaceKey: space.key });
              return {
                spaceKey: space.key,
                genesisFeedKey: space.genesisFeedKey
              };
            },

            presentAdmissionCredentials: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
              try {
                log('processing admission request', { identityKey, deviceKey });
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

                complete.wake();
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
        if (++count > 1) {
          throw new Error(`multiple connections detected: ${count}`);
        }

        log('connected'); // TODO(burdon): Peer id?
        observable.callback.onConnected?.(invitation);
        await complete.wait(); // TODO(burdon): Timeout.
        observable.callback.onSuccess(invitation);
      } catch (err) {
        if (!observable.cancelled) {
          log.error(`RPC failed: ${err} `);
          observableError(observable, err);
        }
      } finally {
        await peer.close();
        await sleep(100);
        await swarmConnection!.close();
      }
    });

    setTimeout(async () => {
      const peerId = PublicKey.random();
      swarmConnection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: topic, // TODO(burdon): Why not use peerId?
        // peerId,
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

    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      await swarmConnection?.close();
    });

    const complete = new Trigger();
    const plugin = createRpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        requested: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        // TODO(burdon): Make these optional.
        exposed: {},
        handlers: {},
        port
      });

      try {
        await peer.open();
        log('connected'); // TODO(burdon): Peer id?
        observable.callback.onConnected?.(invitation);

        // 1. Send request.
        log('sending admission request', { identityKey: invitation.identityKey });
        const { spaceKey, genesisFeedKey } = await peer.rpc.SpaceHostService.requestAdmission();

        // 2. Create local space.
        // TODO(burdon): Abandon if does not complete.
        const space = await this._spaceManager.acceptSpace({ spaceKey, genesisFeedKey });

        // 3. Send admission credentials to host (with local space keys).
        log('sending admission request', { identityKey: invitation.identityKey });
        await peer.rpc.SpaceHostService.presentAdmissionCredentials({
          identityKey: this._signingContext.identityKey,
          deviceKey: this._signingContext.deviceKey,
          controlFeedKey: space.controlFeedKey,
          dataFeedKey: space.dataFeedKey
        });

        // 4. Success.
        observable.callback.onSuccess(invitation);
        complete.wake();
      } catch (err) {
        if (!observable.cancelled) {
          log.error(`Connection failed ${err}`);
          observableError(observable, err);
        }

        complete.wake(); // TODO(burdon): Timeout.
      } finally {
        await peer.close();
      }
    });

    setTimeout(async () => {
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      const peerId = PublicKey.random();
      swarmConnection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: PublicKey.random(), // TODO(burdon): Why not use peerId?
        // peerId,
        protocol: createProtocolFactory(topic, peerId, [plugin]),
        topology: new StarTopology(topic)
      });

      observable.callback.onConnecting?.(invitation);
      await complete.wait();

      // TODO(burdon): Wait for other side to complete (otherwise immediately kills RPC).
      //  Implement mechanism for plugin to finalize (or remove itself).
      await sleep(100);
      await swarmConnection.close();
    });

    return observable;
  }
}
