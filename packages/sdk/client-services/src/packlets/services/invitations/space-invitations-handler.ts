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
import { createRpcPlugin } from '@dxos/protocol-plugin-rpc';
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
    let connection: SwarmConnection | undefined;

    const topic = PublicKey.random();
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      swarmKey: topic,
      spaceKey: space.key
    };

    // TODO(burdon): Stop anything pending.
    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      await connection?.close();
    });

    const plugin = createRpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        port,
        requested: {
          SpaceGuestService: schema.getService('dxos.halo.invitations.SpaceGuestService')
        },
        exposed: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        handlers: {
          SpaceHostService: {
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
              } catch (err) {
                observable.callbacks?.onError(err);
              }
            }
          }
        }
      });

      await peer.open();
      log('connected'); // TODO(burdon): Peer id?
      observable.callbacks?.onConnected(invitation);

      try {
        log('sending admission offer', { spaceKey: space.key });
        await peer.rpc.SpaceGuestService.presentAdmissionOffer({
          spaceKey: space.key,
          genesisFeedKey: space.genesisFeedKey
        });

        observable.callbacks?.onSuccess(invitation);
      } catch (err) {
        if (!observable.cancelled) {
          log.error('RPC failed', err);
          observableError(observable, err);
        }
      }

      await peer.close();
      await sleep(100);
      await connection!.close();
    });

    setTimeout(async () => {
      const peerId = PublicKey.random();
      connection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: topic, // TODO(burdon): Why not use peerId?
        // peerId,
        protocol: createProtocolFactory(topic, peerId, [plugin]),
        topology: new StarTopology(topic)
      });

      observable.callbacks?.onConnecting(invitation);
    });

    return observable;
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local party invitation to the host,
   * which then writes the guest's credentials to the space.
   */
  acceptInvitation(invitation: Invitation): CancellableObservable<InvitationEvents> {
    let connection: SwarmConnection | undefined;

    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      await connection?.close();
    });

    const admitted = new Trigger<Space>();
    const plugin = createRpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        port,
        requested: {
          SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
        },
        exposed: {
          SpaceGuestService: schema.getService('dxos.halo.invitations.SpaceGuestService')
        },
        handlers: {
          SpaceGuestService: {
            presentAdmissionOffer: async ({ spaceKey, genesisFeedKey }) => {
              log('processing admission offer', { spaceKey });
              // Create local space.
              const space = await this._spaceManager.acceptSpace({ spaceKey, genesisFeedKey });

              // Send local space's details to host (inviter).
              try {
                log('sending admission request', { identityKey: invitation.identityKey });
                await peer.rpc.SpaceHostService.presentAdmissionCredentials({
                  identityKey: this._signingContext.identityKey,
                  deviceKey: this._signingContext.deviceKey,
                  controlFeedKey: space.controlFeedKey,
                  dataFeedKey: space.dataFeedKey
                });
              } catch (err) {
                // TODO(burdon): Space is orphaned if we crash before other side ACKs. Retry from cold start possible?
                if (!observable.cancelled) {
                  log.error('RPC failed', err);
                  observableError(observable, err);
                }
              }

              admitted.wake(space);
            }
          }
        }
      });

      await peer.open();
      log('connected'); // TODO(burdon): Peer id?
      observable.callbacks?.onConnected(invitation);
      await admitted.wait();
      await peer.close();
    });

    setTimeout(async () => {
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      const peerId = PublicKey.random();
      connection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: PublicKey.random(), // TODO(burdon): Why not use peerId?
        // peerId,
        protocol: createProtocolFactory(topic, peerId, [plugin]),
        topology: new StarTopology(topic)
      });

      observable.callbacks?.onConnecting(invitation);
      const space = await admitted.wait();
      invitation.spaceKey = space.key;
      observable.callbacks?.onSuccess(invitation);

      // TODO(burdon): Wait for other side to complete (otherwise immediately kills RPC).
      //  Implement mechanism for plugin to finalize (or remove itself).
      await sleep(100);
      await connection.close();
    });

    return observable;
  }
}
