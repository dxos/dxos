//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { codec, DataService, MetadataStore } from '@dxos/echo-db';
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

import { Identity, IdentityManager } from '../identity';
import { InvitationDescriptor } from '../invitations';
import { SpaceManager } from './space-manager';

export type SecretProvider = () => Promise<Buffer>

/**
 * Temporary container for infrastructure.
 */
export class ServiceContext {
  public readonly dataServiceRouter = new DataService();
  public readonly initialized = new Trigger();

  public readonly metadataStore: MetadataStore;
  public readonly keyring: Keyring;
  public readonly feedStore: FeedStore;
  public readonly identityManager: IdentityManager;
  public readonly invitations: HaloInvitations; // TOOD(burdon): Rename.

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

    // TODO(burdon): Rename.
    this.invitations = new HaloInvitations(this.networkManager, this.identityManager, async () => {
      await this._initialize();
    });
  }

  async open () {
    await this.identityManager.open();
  }

  async close () {
    await this.identityManager.close();
  }

  // TODO(dmaretskyi): Rename to createIdentity.
  async create () {
    const identity = await this.identityManager.createIdentity();
    this.dataServiceRouter.trackParty(identity.haloSpaceKey, identity.haloDatabase.createDataServiceHost());
    await this._initialize();
    return identity;
  }

  private async _initialize () {
    const identity = this.identityManager.identity ?? failUndefined();
    const spaceManager = new SpaceManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      this.networkManager,
      // TODO(burdon): ???
      {
        identityKey: identity.identityKey,
        deviceKey: identity.deviceKey,
        credentialSigner: identity.getIdentityCredentialSigner()
      },
      this.dataServiceRouter
    );

    await spaceManager.open();

    this.spaceManager = spaceManager;
    this.initialized.wake();
  }
}

// TODO(burdon): Factor out.
export class HaloInvitations {
  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _identityManager: IdentityManager,
    private readonly _onInitialize: () => Promise<void>
  ) {}

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation ({ onFinish }: { onFinish?: () => void} = {}): Promise<InvitationDescriptor> {
    log('Create invitation');
    const identity = this._identityManager.identity ?? failUndefined();

    const swarmKey = PublicKey.random();
    this._networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: swarmKey,
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [new PluginRpc(async (port) => {
        log('Inviter connected');
        const peer = createProtoRpcPeer({
          requested: {
            InviteeInvitationService: schema.getService('dxos.halo.invitations.InviteeInvitationService')
          },
          exposed: {
            InviterInvitationService: schema.getService('dxos.halo.invitations.InviterInvitationService')
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
        log('Inviter RPC open');

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

  /**
   * Joins an existing identity HALO by invitation.
   */
  async acceptInvitation (invitationDescriptor: InvitationDescriptor): Promise<Identity> {
    const swarmKey = PublicKey.from(invitationDescriptor.swarmKey);

    const done = new Trigger();
    this._networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: PublicKey.random(),
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [new PluginRpc(async (port) => {
        log('Invitee connected');
        const peer = createProtoRpcPeer({
          requested: {
            InviterInvitationService: schema.getService('dxos.halo.invitations.InviterInvitationService')
          },
          exposed: {
            InviteeInvitationService: schema.getService('dxos.halo.invitations.InviteeInvitationService')
          },
          handlers: {
            InviteeInvitationService: {
              acceptIdenity: async ({ identityKey, haloSpaceKey, genesisFeedKey }) => {
                try {
                  log('Accept identity', { identityKey, haloSpaceKey, genesisFeedKey });
                  const identity = await this._identityManager.acceptIdentity({
                    identityKey,
                    haloSpaceKey,
                    haloGenesisFeedKey: genesisFeedKey
                  });

                  log('Try to admit device');
                  await peer.rpc.InviterInvitationService.admitDevice({
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
      })])
    });

    await done.wait();

    return this._identityManager.identity ?? failUndefined();
  }
}
