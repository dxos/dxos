//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';
import { AdmittedFeed, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { createProtoRpcPeer } from '@dxos/rpc';

import { InvitationDescriptor } from './invitation-descriptor';

// TODO(burdon): Possible to factor out echo-db deps.

/**
 * Create and manage data invitations for Data spaces.
 */
export class DataInvitations {
  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext,
    private readonly _spaceManager: SpaceManager
  ) {}

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation (space: Space, { onFinish }: { onFinish?: () => void} = {}): Promise<InvitationDescriptor> {
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
              InviteeInvitationService: schema.getService('dxos.echo.invitation_protocol.InviteeInvitationService')
            },
            exposed: {
              InviterInvitationService: schema.getService('dxos.echo.invitation_protocol.InviterInvitationService')
            },
            handlers: {
              InviterInvitationService: {
                admit: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
                  await space.controlPipeline.writer.write({
                    '@type': 'dxos.echo.feed.CredentialsMessage',
                    credential: await this._signingContext.credentialSigner.createCredential({
                      subject: identityKey,
                      assertion: {
                        '@type': 'dxos.halo.credentials.PartyMember',
                        partyKey: space.key,
                        role: PartyMember.Role.ADMIN
                      }
                    })
                  });

                  await space.controlPipeline.writer.write({
                    '@type': 'dxos.echo.feed.CredentialsMessage',
                    credential: await this._signingContext.credentialSigner.createCredential({
                      subject: controlFeedKey,
                      assertion: {
                        '@type': 'dxos.halo.credentials.AdmittedFeed',
                        partyKey: space.key,
                        deviceKey,
                        identityKey,
                        designation: AdmittedFeed.Designation.CONTROL
                      }
                    })
                  });

                  await space.controlPipeline.writer.write({
                    '@type': 'dxos.echo.feed.CredentialsMessage',
                    credential: await this._signingContext.credentialSigner.createCredential({
                      subject: dataFeedKey,
                      assertion: {
                        '@type': 'dxos.halo.credentials.AdmittedFeed',
                        partyKey: space.key,
                        deviceKey,
                        identityKey,
                        designation: AdmittedFeed.Designation.DATA
                      }
                    })
                  });
                }
              }
            },
            port
          });

          await peer.open();
          log('Inviter RPC open');

          await peer.rpc.InviteeInvitationService.accept({
            spaceKey: space.key,
            genesisFeedKey: space.genesisFeedKey
          });

          onFinish?.();
        })
      ])
    });

    return new InvitationDescriptor(InvitationDescriptorProto.Type.INTERACTIVE, swarmKey, new Uint8Array());
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async acceptInvitation (invitationDescriptor: InvitationDescriptor): Promise<Space> {
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
              InviterInvitationService: schema.getService('dxos.echo.invitation_protocol.InviterInvitationService')
            },
            exposed: {
              InviteeInvitationService: schema.getService('dxos.echo.invitation_protocol.InviteeInvitationService')
            },
            handlers: {
              InviteeInvitationService: {
                accept: async ({ spaceKey, genesisFeedKey }) => {
                  try {
                    log('Accept space', { spaceKey, genesisFeedKey });
                    space = await this._spaceManager.acceptSpace({
                      spaceKey,
                      genesisFeedKey
                    });

                    log('Try to admit member');
                    await peer.rpc.InviterInvitationService.admit({
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
