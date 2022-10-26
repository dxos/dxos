//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event, Trigger } from '@dxos/async';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { AdmittedFeed, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { InvitationDescriptor, SpaceInvitationsService } from '@dxos/protocols/proto/dxos/halo/invitations';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

// TODO(burdon): Add this to the Service host (along-side SpaceManager).
// TODO(burdon): State-machine (handle callbacks).
// TODO(burdon): Objective create the peer once (not on each request) and route to appropriate logic.
// TODO(burdon): Isolate deps on protocol throughout echo-db.
// TODO(burdon): Service impl pattern with clean open/close semantics.

/**
 * Create and manage data invitations for Data spaces.
 */
// TODO(burdon): Rename SpaceInvitationsServiceImpl.
export class DataInvitations {
  private readonly _peer: ProtoRpcPeer<{ SpaceInvitationsService: SpaceInvitationsService }>;
  private readonly _agentAdmitted = new Event<{ spaceKey: PublicKey; identityKey: PublicKey }>();

  constructor(
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext,
    private readonly _spaceManager: SpaceManager
  ) {
    this._peer = this._createPeer();
  }

  async open() {
    await this._peer.open();
  }

  async close() {
    await this._peer.close();
  }

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
        // TODO(burdon): Should this be created each time or added to the protocol once?
        new RpcPlugin(async (port) => {
          log('Inviter connected');

          await this._peer.rpc.SpaceInvitationsService.acceptAgent({
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
  async acceptInvitation(invitation: InvitationDescriptor): Promise<Space> {
    log('Accept invitation');

    const swarmKey = PublicKey.from(invitation.swarmKey);

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
          await peer.open();
          log('Invitee RPC open');
        })
      ])
    });

    await done.wait();
    return space!;
  }

  private _createPeer() {
    return createProtoRpcPeer({
      requested: {
        SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
      },
      exposed: {
        SpaceInvitationsService: schema.getService('dxos.halo.invitations.SpaceInvitationsService')
      },
      handlers: {
        SpaceInvitationsService: {
          //
          //
          //
          admitAgent: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
            const space = this._spaceManager.spaces.get(identityKey); // TODO(burdon): Correct key?
            assert(space);

            // TODO(burdon): Factor out (test separately).
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
          },

          //
          //
          //
          acceptAgent: async ({ spaceKey, genesisFeedKey }) => {
            try {
              log('Accept space', { spaceKey, genesisFeedKey });
              const space = await this._spaceManager.acceptSpace({
                spaceKey,
                genesisFeedKey
              });

              log('Try to admit member');
              await this._peer.rpc.SpaceInvitationsService.admitAgent({
                identityKey: this._signingContext.identityKey,
                deviceKey: this._signingContext.deviceKey,
                controlFeedKey: space.controlFeedKey,
                dataFeedKey: space.dataFeedKey
              });

              this._agentAdmitted.emit({ spaceKey, identityKey: this._signingContext.identityKey });
              log('Invitee done');
            } catch (err: any) {
              log.catch(err);
            }
          }
        }
      },
      this._port
    });
  }
}
