//
// Copyright 2022 DXOS.org
//

import { AsyncEvents, CancellableObservableEvents, CancellableObservableProvider, sleep, Trigger } from '@dxos/async';
import { createAdmissionCredentials } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { createRpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { createProtoRpcPeer } from '@dxos/rpc';

// TODO(burdon): Factor out.
export interface CreateInvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnect(invitation: InvitationDescriptor): void;
  onSuccess(): void;
}

export interface AcceptInvitationEvents extends AsyncEvents, CancellableObservableEvents {
  onConnect(invitation: InvitationDescriptor): void;
  onSuccess(space: Space): void;
}

/**
 * Manages the life-cycle of Space invitations between peers.
 */
// TODO(burdon): Rename factory.
export class SpaceInvitations {
  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext
  ) {}

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(space: Space): CancellableObservableProvider<CreateInvitationEvents> {
    let connection: SwarmConnection | undefined = undefined;
    const observable = new CancellableObservableProvider<CreateInvitationEvents>(async () => {
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
              log('processing admission request', { identityKey, deviceKey });
              // TODO(burdon): Wrap observable.
              try {
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

      // TODO(burdon): Error handling and timeout.
      await peer.open();
      {
        log('sending admission offer', { spaceKey: space.key });
        await peer.rpc.SpaceGuestService.presentAdmissionOffer({
          spaceKey: space.key,
          genesisFeedKey: space.genesisFeedKey
        });

        observable.callbacks?.onSuccess();
      }
      await peer.close();

      // TODO(burdon): Wait for other side to complete (otherwise immediately kills RPC).
      await sleep(100);
      await connection!.close();
    });

    setTimeout(async () => {
      const topic = PublicKey.random();
      const peerId = PublicKey.random(); // TODO(burdon): Use actual key.
      const invitation: InvitationDescriptor = {
        type: InvitationDescriptor.Type.INTERACTIVE, // TODO(burdon): Remove (default).
        swarmKey: topic.asUint8Array(),
        invitation: new Uint8Array() // TODO(burdon): Remove.
      };

      connection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: topic, // TODO(burdon): Why???
        // peerId,
        protocol: createProtocolFactory(topic, peerId, [plugin]),
        topology: new StarTopology(topic)
      });

      observable.callbacks?.onConnect(invitation);
    });

    return observable;
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local party invitation to the host,
   * which then writes the guest's credentials to the space.
   */
  acceptInvitation(invitation: InvitationDescriptor): CancellableObservableProvider<AcceptInvitationEvents> {
    let connection: SwarmConnection | undefined = undefined;
    const observable = new CancellableObservableProvider<AcceptInvitationEvents>(async () => {
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
              // TODO(burdon): Space is orphaned if we crash before other side ACKs. Retry from cold start possible?
              log('sending admission request', { identityKey: invitation.identityKey });
              await peer.rpc.SpaceHostService.presentAdmissionCredentials({
                identityKey: this._signingContext.identityKey,
                deviceKey: this._signingContext.deviceKey,
                controlFeedKey: space.controlFeedKey,
                dataFeedKey: space.dataFeedKey
              });

              admitted.wake(space);
            }
          }
        }
      });

      await peer.open();
      await admitted.wait();
      await peer.close();
    });

    setTimeout(async () => {
      const topic = PublicKey.from(invitation.swarmKey);
      const peerId = PublicKey.random(); // TODO(burdon): Use actual key.
      connection = await this._networkManager.openSwarmConnection({
        topic,
        peerId: PublicKey.random(), // TODO(burdon): Why???
        // peerId,
        protocol: createProtocolFactory(topic, peerId, [plugin]),
        topology: new StarTopology(topic)
      });

      observable.callbacks?.onConnect(invitation);
      const space = await admitted.wait();
      observable.callbacks?.onSuccess(space);

      // TODO(burdon): Wait for host to complete (otherwise immediately kills swarm peer and RPC doesn't complete).
      await sleep(100);
      await connection.close();
    });

    return observable;
  }
}
