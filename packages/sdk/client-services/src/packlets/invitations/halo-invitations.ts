//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { HaloInvitationsService, InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { Identity, IdentityManager } from '../identity';

const invalidOp = (_: any): Promise<void> => {
  throw new Error('invalid call');
};

/**
 * Create and process Halo (space) invitations for device management.
 */
export class HaloInvitations {
  constructor(
    private readonly _networkManager: NetworkManager,
    private readonly _identityManager: IdentityManager,
    private readonly _onInitialize: () => Promise<void>
  ) {}

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation({ onFinish }: { onFinish?: () => void } = {}): Promise<InvitationDescriptor> {
    log('Create invitation');
    const identity = this._identityManager.identity ?? failUndefined();

    const swarmKey = PublicKey.random();
    await this._networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: swarmKey,
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [
        new RpcPlugin(async (port) => {
          const peer = createProtoRpcPeer({
            requested: {
              HaloInvitationsService: schema.getService('dxos.halo.invitations.HaloInvitationsService')
            },
            exposed: {
              HaloInvitationsService: schema.getService('dxos.halo.invitations.HaloInvitationsService')
            },
            handlers: {
              HaloInvitationsService: {
                admitDevice: async ({ deviceKey, controlFeedKey, dataFeedKey }) => {
                  log('Admit device', { deviceKey });
                  await identity.controlPipeline.writer.write({
                    '@type': 'dxos.echo.feed.CredentialsMessage',
                    credential: await identity.getIdentityCredentialSigner().createCredential({
                      subject: deviceKey,
                      assertion: {
                        '@type': 'dxos.halo.credentials.AuthorizedDevice',
                        identityKey: identity.identityKey,
                        deviceKey
                      }
                    })
                  });
                  // TODO(dmaretskyi): We'd also need to admit device2's feeds otherwise messages from them won't be processed by the pipeline.
                },
                acceptDevice: invalidOp
              }
            },
            port
          });

          await peer.open();
          log('Inviter RPC open');

          await peer.rpc.HaloInvitationsService.acceptDevice({
            identityKey: identity.identityKey,
            haloSpaceKey: identity.haloSpaceKey,
            genesisFeedKey: identity.haloGenesisFeedKey
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
  async acceptInvitation(invitation: InvitationDescriptor): Promise<Identity> {
    const swarmKey = PublicKey.from(invitation.swarmKey);

    let connected = false;
    const done = new Trigger();
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
          const peer: ProtoRpcPeer<{ HaloInvitationsService: HaloInvitationsService }> = createProtoRpcPeer({
            requested: {
              HaloInvitationsService: schema.getService('dxos.halo.invitations.HaloInvitationsService')
            },
            exposed: {
              HaloInvitationsService: schema.getService('dxos.halo.invitations.HaloInvitationsService')
            },
            handlers: {
              HaloInvitationsService: {
                admitDevice: invalidOp,
                acceptDevice: async ({ identityKey, haloSpaceKey, genesisFeedKey }) => {
                  try {
                    log('Accept identity', {
                      identityKey,
                      haloSpaceKey,
                      genesisFeedKey
                    });
                    const identity = await this._identityManager.acceptIdentity({
                      identityKey,
                      haloSpaceKey,
                      haloGenesisFeedKey: genesisFeedKey
                    });

                    log('Try to admit device');
                    await peer.rpc.HaloInvitationsService.admitDevice({
                      deviceKey: identity.deviceKey,
                      controlFeedKey: PublicKey.random(),
                      dataFeedKey: PublicKey.random()
                    });

                    log('Waiting for identity to be ready');
                    await identity.ready();

                    await this._onInitialize();

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

    return this._identityManager.identity ?? failUndefined();
  }
}
