//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { createRpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer } from '@dxos/rpc';

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
  async createInvitation({ onFinish }: { onFinish?: () => void } = {}): Promise<Invitation> {
    const identity = this._identityManager.identity ?? failUndefined();

    const plugin = createRpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        port,
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

              // TODO(dmaretskyi): Admit guest's feeds otherwise messages from them won't be processed by the pipeline.
            }
          }
        }
      });

      await peer.open();
      {
        log('sending admission offer', { identityKey: identity.identityKey });
        await peer.rpc.HaloGuestService.presentAdmissionOffer({
          identityKey: identity.identityKey,
          haloSpaceKey: identity.haloSpaceKey,
          genesisFeedKey: identity.haloGenesisFeedKey
        });

        onFinish?.();
      }
      await peer.close();
      await connection.close();
    });

    const topic = PublicKey.random();
    const peerId = PublicKey.random(); // TODO(burdon): Fails if using the actual peer key.
    const connection = await this._networkManager.openSwarmConnection({
      topic,
      peerId: topic, // TODO(burdon): Why???
      // peerId,
      protocol: createProtocolFactory(topic, peerId, [plugin]),
      topology: new StarTopology(topic)
    });

    return {
      type: Invitation.Type.INTERACTIVE,
      swarmKey: topic
    };
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async acceptInvitation(invitation: Invitation): Promise<Identity> {
    const admitted = new Trigger<Identity>(); // TODO(burdon): Must not share across multiple connections.

    const plugin = createRpcPlugin(async (port) => {
      const peer = createProtoRpcPeer({
        port,
        requested: {
          // TODO(burdon): Rename in-bound.
          HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
        },
        exposed: {
          // TODO(burdon): Rename out-bound?
          HaloGuestService: schema.getService('dxos.halo.invitations.HaloGuestService')
        },
        handlers: {
          // TODO(burdon): Factory to create handlers and open/close handlers.
          HaloGuestService: {
            presentAdmissionOffer: async ({ identityKey, haloSpaceKey, genesisFeedKey }) => {
              log('processing admission offer', { identityKey });
              const identity = await this._identityManager.acceptIdentity({
                identityKey,
                haloSpaceKey,
                haloGenesisFeedKey: genesisFeedKey
              });

              log('sending admission request', { identityKey: invitation.identityKey });
              await peer.rpc.HaloHostService.presentAdmissionCredentials({
                deviceKey: identity.deviceKey,
                controlFeedKey: PublicKey.random(),
                dataFeedKey: PublicKey.random()
              });

              // TODO(burdon): Document.
              await identity.ready();
              admitted.wake(identity);
            }
          }
        }
      });

      await peer.open();
      await admitted.wait();
      await peer.close();
    });

    assert(invitation.swarmKey);
    const topic = PublicKey.from(invitation.swarmKey);
    const peerId = PublicKey.random(); // TODO(burdon): Fails if using the actual peer key.
    const connection = await this._networkManager.openSwarmConnection({
      topic,
      peerId: PublicKey.random(),
      // peerId,
      protocol: createProtocolFactory(topic, peerId, [plugin]),
      topology: new StarTopology(topic)
    });

    const identity = await admitted.wait();
    await this._onInitialize();
    await connection.close();
    return identity;
  }
}
