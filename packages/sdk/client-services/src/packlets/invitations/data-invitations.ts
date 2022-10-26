//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { CredentialSigner } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema, TypedMessage } from '@dxos/protocols';
import { AdmittedFeed, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { createProtoRpcPeer } from '@dxos/rpc';

// TODO(burdon): Add this to the Service host (along-side SpaceManager).
// TODO(burdon): State-machine (handle callbacks).
// TODO(burdon): Objective create the peer once (not on each request) and route to appropriate logic.
// TODO(burdon): Isolate deps on protocol throughout echo-db.
// TODO(burdon): Service impl pattern with clean open/close semantics.

// TODO(burdon): Plugin should be created with the space (not on each request).

/**
 * Create and manage data invitations for Data spaces.
 */
export class DataInvitations {
  constructor(
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext,
    private readonly _spaceManager: SpaceManager
  ) {}

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation(space: Space, { onFinish }: { onFinish?: () => void } = {}): Promise<InvitationDescriptor> {
    log('Create invitation');

    const swarmKey = PublicKey.random();
    await this._networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: swarmKey,
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [
        new RpcPlugin(async (port) => {
          log('Inviter connected');
          const peer = createProtoRpcPeer({
            requested: {
              SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
            },
            exposed: {
              SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
            },
            handlers: {
              SpaceInvitationsService: {
                admitAgent: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
                  const credentials = await createAdmissionCredentials(
                    this._signingContext.credentialSigner,
                    identityKey,
                    space.key,
                    deviceKey,
                    controlFeedKey,
                    dataFeedKey
                  );

                  // TODO(burdon): Factor out batch writer.
                  await Promise.all(credentials.map((message) => space.controlPipeline.writer.write(message)));
                }
              }
            },
            port
          });

          await peer.open();
          log('Inviter RPC open');

          await peer.rpc.SpaceInvitationsService.acceptAgent({
            spaceKey: space.key,
            genesisFeedKey: space.genesisFeedKey
          });

          onFinish?.();
        })
      ])
    });

    return {
      type: InvitationDescriptor.Type.INTERACTIVE,
      swarmKey: swarmKey.asUint8Array(),
      invitation: new Uint8Array() // TODO(burdon): Required.
    };
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async acceptInvitation(invitationDescriptor: InvitationDescriptor): Promise<Space> {
    log('Accept invitation');
    const swarmKey = PublicKey.from(invitationDescriptor.swarmKey);

    const done = new Trigger();
    let space: Space;
    let connected = false;
    await this._networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: PublicKey.random(),
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [
        new RpcPlugin(async (port) => {
          log('Invitee connected');
          // Peers might get connected twice because of certain network conditions. We ignore any subsequent connections.
          // TODO(dmaretskyi): More robust way to handle this.
          if (connected) {
            // TODO(dmaretskyi): Close connection.
            log.warn('Ignore duplicate connection');
            return;
          }

          connected = true;
          const peer = createProtoRpcPeer({
            requested: {
              SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
            },
            exposed: {
              SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
            },
            handlers: {
              SpaceInvitationsService: {
                acceptAgent: async ({ spaceKey, genesisFeedKey }) => {
                  try {
                    log('Accept space', { spaceKey, genesisFeedKey });
                    space = await this._spaceManager.acceptSpace({
                      spaceKey,
                      genesisFeedKey
                    });

                    log('Try to admit member');
                    await peer.rpc.SpaceInvitationsService.admitAgent({
                      identityKey: this._signingContext.identityKey,
                      deviceKey: this._signingContext.deviceKey,
                      controlFeedKey: space.controlFeedKey,
                      dataFeedKey: space.dataFeedKey
                    });

                    done.wake();
                    log('Invitee done');
                  } catch (err: any) {
                    log.catch(err);
                  }
                }
              }
            },
            port
          });

          await peer.open();
          log('Invitee RPC open');
        })
      ])
    });

    await done.wait();

    return space!;
  }
}

// TODO(burdon): Factor out (for tests).
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
