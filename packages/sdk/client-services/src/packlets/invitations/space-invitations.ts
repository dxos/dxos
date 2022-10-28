//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { CredentialSigner } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema, TypedMessage } from '@dxos/protocols';
import { AdmittedFeed, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { InvitationDescriptor, SpaceInvitationsService } from '@dxos/protocols/proto/dxos/halo/invitations';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

// TODO(burdon): Create and builder.

// TODO(burdon): Objective: Service impl pattern with clean open/close semantics.
// TODO(burdon): Isolate deps on protocol throughout echo-db.

// TODO(burdon): Plugin should be created with the space (not on each request)?
//  - What is the life-cycle of the network swarm connection?
//    Why is this done each time instead of relying on the current swarm?
//  - Make docs clear (e.g., Host/Guest, request/offer).

// TODO(burdon): RPCPlugin vs. AuthPlugin?

const invalidOp = (_: any): Promise<void> => {
  throw new Error('invalid call');
};

/**
 * Manages the life-cycle of Space invitations between peers.
 */
export class SpaceInvitations {
  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext
  ) {}

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  // TODO(burdon): Give handler state machine to API with e.g., sync state. Replace onFinish.
  // TODO(burdon): Instead of callback, add wait function to returned wrapper object.
  async createInvitation(space: Space, { onFinish }: { onFinish?: () => void } = {}): Promise<InvitationDescriptor> {
    log('Create invitation');

    // TODO(burdon): Timeout (which should automatically close everything).
    const admitted = new Trigger();

    const topic = PublicKey.random();
    const connection = await this._joinSwarm(
      topic,
      createRpcPlugin(
        {
          // TODO(burdon): Rename verbs (this means the "guest" is requesting credentials).
          // TODO(burdon): What prevents the other side from just calling us? Require secret?
          admitAgent: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
            await writeMessages(
              space.controlPipeline.writer,
              await createAdmissionCredentials(
                this._signingContext.credentialSigner,
                identityKey,
                space.key,
                deviceKey,
                controlFeedKey,
                dataFeedKey
              )
            );

            admitted.wake();
          },

          // TODO(burdon): Make calls optional and throw error if not handled?
          acceptAgent: invalidOp
        },
        {
          // This is called once the connection is established with the peer.
          onOpen: async (peer) => {
            await peer.rpc.SpaceInvitationsService.acceptAgent({
              spaceKey: space.key,
              genesisFeedKey: space.genesisFeedKey
            });

            await admitted.wait();
            onFinish?.();
          },

          // This is called once the connection is closed (or on error).
          onClose: async () => {
            await connection.close();
          }
        }
      )
    );

    return {
      type: InvitationDescriptor.Type.INTERACTIVE, // TODO(burdon): Remove (default).
      swarmKey: topic.asUint8Array(),
      invitation: new Uint8Array() // TODO(burdon): Required.
    };
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local party invitation to the host,
   * which then writes the guest's credentials to the space.
   */
  async acceptInvitation(invitation: InvitationDescriptor): Promise<Space> {
    log('Accept invitation', invitation);

    // TODO(burdon): State machine.
    // TODO(burdon): Timeout (which should automatically close everything).
    const accepted = new Trigger<Space>();
    const admitted = new Trigger<Space>();

    const topic = PublicKey.from(invitation.swarmKey);
    const connection = await this._joinSwarm(
      topic,
      createRpcPlugin(
        {
          admitAgent: invalidOp,

          // TODO(burdon): Rename verbs: this means the "host" is accepting the local peer (the "guest").
          acceptAgent: async ({ spaceKey, genesisFeedKey }) => {
            // Create local space.
            const space = await this._spaceManager.acceptSpace({ spaceKey, genesisFeedKey });
            accepted.wake(space);
          }
        },
        {
          // TODO(burdon): Anyone could be called here (and multiple times if network interrupted).
          // This is called once the connection is established with the peer.
          onOpen: async (peer) => {
            // Wait for host to ACK and local space to be created.
            const space = await accepted.wait();

            // Send local space's details to host (inviter).
            // TODO(burdon): Do we need to include the space key in case these get mixed up?
            // TODO(burdon): Space is orphaned if we crash before other side ACKs. Retry from cold start possible?
            await peer.rpc.SpaceInvitationsService.admitAgent({
              identityKey: this._signingContext.identityKey,
              deviceKey: this._signingContext.deviceKey,
              controlFeedKey: space.controlFeedKey,
              dataFeedKey: space.dataFeedKey
            });

            // All done.
            admitted.wake(space);
          },

          // This is called once the connection is closed (or on error).
          onClose: async () => {
            await connection.close();
          }
        }
      )
    );

    return await admitted.wait();
  }

  //
  //
  //
  // Utils
  // TODO(burdon): Common across all invitation processing and RPCs.
  //
  //
  //

  // TODO(burdon): Timeout.
  private async _joinSwarm(topic: PublicKey, plugin: RpcPlugin) {
    return await this._networkManager.openSwarmConnection({
      topic,
      peerId: PublicKey.random(),
      topology: new StarTopology(topic),
      // TODO(burdon): Second arg should be peerKey?
      protocol: createProtocolFactory(topic, topic, [plugin])
    });
  }
}

type CreateRpcPluginOptions = {
  onOpen?: (peer: ProtoRpcPeer<{ SpaceInvitationsService: SpaceInvitationsService }>) => Promise<void>;
  onClose?: () => Promise<void>;
};

/**
 * Creates an RPC plugin with the given handlers.
 * Calls the callback once the connection is established?
 */
// TODO(burdon): Factor out.
// prettier-ignore
const createRpcPlugin = (
  handlers: SpaceInvitationsService,
  options?: CreateRpcPluginOptions
) => {
  const { onOpen, onClose } = options ?? {};

  return new RpcPlugin(async (port) => {
    // TODO(burdon): What does connection mean? Just one peer?
    //  See original comment re handling multiple connections.
    const peer = createProtoRpcPeer({
      // TODO(burdon): Rename?
      requested: {
        SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
      },
      exposed: {
        SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
      },
      handlers: {
        SpaceInvitationsService: handlers
      },
      port
    });

    try {
      await peer.open();
      await onOpen?.(peer);
    } catch (err: any) {
      log.error('RPC handler failed', err);
    } finally {
      await peer.close();
      await onClose?.();
    }
  });
};

// TODO(burdon): Factor out (with tests). See CredentialGenerator.
const createAdmissionCredentials = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  spaceKey: PublicKey,
  deviceKey: PublicKey,
  controlFeedKey: PublicKey,
  dataFeedKey: PublicKey
): Promise<TypedMessage[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: spaceKey,
        role: PartyMember.Role.ADMIN
      }
    }),
    await signer.createCredential({
      subject: controlFeedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: spaceKey,
        deviceKey,
        identityKey,
        designation: AdmittedFeed.Designation.CONTROL
      }
    }),
    await signer.createCredential({
      subject: dataFeedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: spaceKey,
        deviceKey,
        identityKey,
        designation: AdmittedFeed.Designation.DATA
      }
    })
  ]);

  return credentials.map((credential) => ({
    '@type': 'dxos.echo.feed.CredentialsMessage',
    credential
  }));
};
