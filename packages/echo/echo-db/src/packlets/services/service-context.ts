//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';
import { Storage } from '@dxos/random-access-storage';
import { createProtoRpcPeer } from '@dxos/rpc';

import { codec } from '../../codec';
import { InvitationDescriptor } from '../../invitations/invitation-descriptor';
import { DataService } from '../database';
import { MetadataStore } from '../metadata';
import { IdentityManager } from './identity-manager';
import { SpaceManager } from './space-manager';

export type SecretProvider = () => Promise<Buffer>

/**
 * Temporary container for infrastructure.
 */
export class ServiceContext {
  public readonly dataServiceRouter = new DataService();
  public readonly braneReady = new Trigger();

  public readonly metadataStore: MetadataStore;
  public readonly keyring: Keyring;
  public readonly feedStore: FeedStore;
  public readonly identityManager: IdentityManager;

  // Initialized after identity is intitialized.
  public spaceManager?: SpaceManager;

  constructor (
    public storage: Storage,
    public networkManager: NetworkManager
  ) {
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.keyring = new Keyring(storage.createDirectory('keyring'));
    this.feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec });
    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      networkManager
    );
  }

  async open () {
    await this.identityManager.open();
  }

  async close () {
    await this.identityManager.close();
  }

  /**
   * Create initial identity.
   */
  async createIdentity () {
    const identity = await this.identityManager.createIdentity();
    this.dataServiceRouter.trackParty(identity.haloSpaceKey, identity.haloDatabase.createDataServiceHost());
    await this._initBrane();
    return identity;
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async join (invitationDescriptor: InvitationDescriptor) {
    const swarmKey = PublicKey.from(invitationDescriptor.swarmKey);

    const done = new Trigger();

    this.networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: PublicKey.random(),
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [new PluginRpc(async (port) => {
        log('Invitee connected');
        const peer = createProtoRpcPeer({
          requested: {
            InviterInvitationService: schema.getService('dxos.invitations.InviterInvitationService')
          },
          exposed: {
            InviteeInvitationService: schema.getService('dxos.invitations.InviteeInvitationService')
          },
          handlers: {
            InviteeInvitationService: {
              acceptIdenity: async ({ identityKey, haloSpaceKey, genesisFeedKey }) => {
                try {
                  log('Accept identity', { identityKey, haloSpaceKey, genesisFeedKey });

                  const identity = await this.identityManager.acceptIdentity({
                    identityKey,
                    haloSpaceKey,
                    haloGenesisFeedKey: genesisFeedKey
                  });

                  log('Try to admit device');
                  await peer.rpc.InviterInvitationService.admitDevice({
                    deviceKey: identity.deviceKey,
                    // TODO(dmaretskyi): .
                    controlFeedKey: PublicKey.random(),
                    dataFeedKey: PublicKey.random()
                  });

                  log('Waiting for identity to be ready');
                  await identity.ready();

                  await this._initBrane();

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
      })])
    });

    await done.wait();

    return this.identityManager.identity ?? failUndefined();
  }

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation ({ onFinish }: { onFinish?: () => void} = {}): Promise<InvitationDescriptor> {
    log('Create invitation');
    const identity = this.identityManager.identity ?? failUndefined();

    const swarmKey = PublicKey.random();
    this.networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: swarmKey,
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [new PluginRpc(async (port) => {
        log('Inviter connected');
        const peer = createProtoRpcPeer({
          requested: {
            InviteeInvitationService: schema.getService('dxos.invitations.InviteeInvitationService')
          },
          exposed: {
            InviterInvitationService: schema.getService('dxos.invitations.InviterInvitationService')
          },
          handlers: {
            InviterInvitationService: {
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
              }
            }
          },
          port
        });

        await peer.open();
        log('Inviter RPC open.');

        await peer.rpc.InviteeInvitationService.acceptIdenity({
          identityKey: identity.identityKey,
          haloSpaceKey: identity.haloSpaceKey,
          genesisFeedKey: identity.haloGenesisFeedKey
        });

        onFinish?.();
      })])
    });

    return new InvitationDescriptor(InvitationDescriptorProto.Type.INTERACTIVE, swarmKey, new Uint8Array());
  }

  private async _initBrane () {
    const identity = this.identityManager.identity ?? failUndefined();
    const spaceManager = new SpaceManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      this.networkManager,
      {
        identityKey: identity.identityKey,
        deviceKey: identity.deviceKey,
        credentialSigner: identity.getIdentityCredentialSigner()
      },
      this.dataServiceRouter
    );
    await spaceManager.open();
    this.spaceManager = spaceManager;
    this.braneReady.wake();
  }
}
