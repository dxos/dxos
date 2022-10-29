//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { createRpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';

import { Identity, IdentityManager } from '../identity';

/**
 * Creates and processes Halo invitations between devices.
 */
export class HaloInvitations {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _networkManager: NetworkManager,
    private readonly _onInitialize: () => Promise<void> // TODO(burdon): ???
  ) {}

  /**
   * Sends a HALO admission offer and waits for guest to accept.
   */
  async createInvitation({ onFinish }: { onFinish?: () => void } = {}): Promise<InvitationDescriptor> {
    const identity = this._identityManager.identity ?? failUndefined();

    const plugin = createRpcPlugin(
      {
        requested: {
          HaloGuestService: schema.getService('dxos.halo.invitations.HaloGuestService')
        },
        exposed: {
          HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
        },
        handlers: {
          HaloHostService: {
            presentAdmissionCredentials: async ({ deviceKey, controlFeedKey, dataFeedKey }) => {
              log('processing admission request', { identityKey: identity.identityKey, deviceKey });

              // TODO(burdon): Use CredentialGenerator.
              const signer = identity.getIdentityCredentialSigner();
              await identity.controlPipeline.writer.write({
                '@type': 'dxos.echo.feed.CredentialsMessage',
                credential: await signer.createCredential({
                  subject: deviceKey,
                  assertion: {
                    '@type': 'dxos.halo.credentials.AuthorizedDevice',
                    identityKey: identity.identityKey,
                    deviceKey
                  }
                })
              });

              // TODO(burdon): Should ACK.
              // TODO(dmaretskyi): Admit device2's feeds otherwise messages from them won't be processed by the pipeline.
            }
          }
        }
      },
      {
        onOpen: async (peer) => {
          log('sending admission offer', { identityKey: identity.identityKey });
          await peer.rpc.HaloGuestService.presentAdmissionOffer({
            identityKey: identity.identityKey,
            haloSpaceKey: identity.haloSpaceKey,
            genesisFeedKey: identity.haloGenesisFeedKey
          });

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
      type: InvitationDescriptor.Type.INTERACTIVE,
      swarmKey: topic.asUint8Array(),
      invitation: new Uint8Array() // TODO(burdon): Remove.
    };
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async acceptInvitation(invitation: InvitationDescriptor): Promise<Identity> {
    const accepted = new Trigger<Identity>();
    const admitted = new Trigger<Identity>();

    const plugin = createRpcPlugin(
      {
        requested: {
          HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
        },
        exposed: {
          HaloGuestService: schema.getService('dxos.halo.invitations.HaloGuestService')
        },
        handlers: {
          HaloGuestService: {
            presentAdmissionOffer: async ({ identityKey, haloSpaceKey, genesisFeedKey }) => {
              log('processing admission offer', { identityKey });
              const identity = await this._identityManager.acceptIdentity({
                identityKey,
                haloSpaceKey,
                haloGenesisFeedKey: genesisFeedKey
              });

              accepted.wake(identity);
            }
          }
        }
      },
      {
        onOpen: async (peer) => {
          // Wait for host to ACK request and local identity to be created.
          const identity = await accepted.wait();

          log('sending admission request', { identityKey: invitation.identityKey });
          await peer.rpc.HaloHostService.presentAdmissionCredentials({
            deviceKey: identity.deviceKey,
            controlFeedKey: PublicKey.random(),
            dataFeedKey: PublicKey.random()
          });

          await identity.ready();
          await this._onInitialize();
          admitted.wake(identity);
        },

        onClose: async () => {
          await connection.close();
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

    await admitted.wait();
    return this._identityManager.identity ?? failUndefined();
  }
}
