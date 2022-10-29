//
// Copyright 2022 DXOS.org
//

import { asyncCatch, AsyncCallbacks, Observable, ObservableImpl, Trigger } from '@dxos/async';
import { createAdmissionCredentials } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { createRpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';

// TODO(burdon): Timeout.
// TODO(burdon): Objective: Service impl pattern with clean open/close semantics.
// TODO(burdon): Isolate deps on protocol throughout echo-db.

interface InvitationEvents extends AsyncCallbacks {
  onConnect(invitation: InvitationDescriptor): void;
  onComplete(): void;
  onReject(): void
}

type InvitationObservable = Observable<InvitationEvents>;

const _ = async (space: Space, spaceInvitations: SpaceInvitations) => {
  // Impl.
  const f = (): InvitationObservable => {
    const observable = new ObservableImpl<InvitationEvents>();

    asyncCatch(
      async () => {
        setTimeout(() => {
          observable.callbacks?.onConnect({} as InvitationDescriptor)
        }, 100);
      },
      observable,
      30_000
    );

    return observable;
  };

  // Caller.
  // TODO(burdon): Cancel/reset?
  const observable = f();
  observable.observe({
    onConnect: (invitation) => {
      console.log(invitation);
    },
    onComplete: () => {},
    onReject: () => {},
    onTimeout (err): void {
      console.log(err);
    },
    onError: (err: Error) => {
      console.log(err);
    }
  });
};

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
  // TODO(burdon): Replace callback with observable.
  async createInvitation(space: Space, { onFinish }: { onFinish?: () => void } = {}): Promise<InvitationDescriptor> {
    const admitted = new Trigger();

    const plugin = createRpcPlugin(
      {
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

              admitted.wake();
            }
          }
        }
      },
      {
        onOpen: async (peer) => {
          log('sending admission offer', { spaceKey: space.key });
          await peer.rpc.SpaceGuestService.presentAdmissionOffer({
            spaceKey: space.key,
            genesisFeedKey: space.genesisFeedKey
          });

          await admitted.wait();
          onFinish?.();
        },

        onClose: async () => {
          await connection.close();
        }
      }
    );

    const topic = PublicKey.random();
    const peerId = PublicKey.random(); // TODO(burdon): Use actual key.
    const connection = await this._networkManager.openSwarmConnection({
      topic,
      peerId: topic, // TODO(burdon): Why???
      // peerId,
      protocol: createProtocolFactory(topic, peerId, [plugin]),
      topology: new StarTopology(topic)
    });

    return {
      type: InvitationDescriptor.Type.INTERACTIVE, // TODO(burdon): Remove (default).
      swarmKey: topic.asUint8Array(),
      invitation: new Uint8Array() // TODO(burdon): Remove.
    };
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local party invitation to the host,
   * which then writes the guest's credentials to the space.
   */
  async acceptInvitation(invitation: InvitationDescriptor): Promise<Space> {
    const accepted = new Trigger<Space>();
    const admitted = new Trigger<Space>();

    const plugin = createRpcPlugin(
      {
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
              accepted.wake(space);
            }
          }
        }
      },
      {
        onOpen: async (peer) => {
          // Wait for host to ACK and local space to be created.
          const space = await accepted.wait();

          // Send local space's details to host (inviter).
          // TODO(burdon): Could be called multiple times.
          // TODO(burdon): Space is orphaned if we crash before other side ACKs. Retry from cold start possible?
          log('sending admission request', { identityKey: invitation.identityKey });
          await peer.rpc.SpaceHostService.presentAdmissionCredentials({
            identityKey: this._signingContext.identityKey,
            deviceKey: this._signingContext.deviceKey,
            controlFeedKey: space.controlFeedKey,
            dataFeedKey: space.dataFeedKey
          });

          // All done.
          admitted.wake(space);
        },

        onClose: async () => {
          await connection.close();
        },

        onError: (err: Error) => {
          log.error('connection failed', err);
        }
      }
    );

    const topic = PublicKey.from(invitation.swarmKey);
    const peerId = PublicKey.random(); // TODO(burdon): Use actual key.
    const connection = await this._networkManager.openSwarmConnection({
      topic,
      peerId: PublicKey.random(), // TODO(burdon): Why???
      // peerId,
      protocol: createProtocolFactory(topic, peerId, [plugin]),
      topology: new StarTopology(topic)
    });

    return await admitted.wait();
  }
}
