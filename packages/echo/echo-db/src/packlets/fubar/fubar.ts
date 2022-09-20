import { Trigger } from "@dxos/async";
import { failUndefined } from "@dxos/debug";
import { codec } from "@dxos/echo-protocol";
import { FeedStore } from "@dxos/feed-store";
import { Keyring } from "@dxos/keyring";
import { createProtocolFactory, NetworkManager, StarTopology } from "@dxos/network-manager";
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { PublicKey, schema } from "@dxos/protocols";
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';
import { Storage } from "@dxos/random-access-storage";
import { createProtoRpcPeer } from '@dxos/rpc';
import { InvitationDescriptor } from "../../invitations/invitation-descriptor";
import { MetadataStore } from "../metadata";
import { IdentityManager } from "./identity-manager";
import { log } from '@dxos/log'

export type SecretProvider = () => Promise<Buffer>

export class Fubar {
  public metadataStore: MetadataStore;
  public keyring: Keyring;
  public feedStore: FeedStore;
  public identityManager: IdentityManager

  constructor(
    public storage: Storage,
    public networkManager: NetworkManager,
  ) {
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.keyring = new Keyring(storage.createDirectory('keyring'));
    this.feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec })
    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      networkManager,
    )
  }

  async open() {
    await this.identityManager.open()
  }

  async close() {
    await this.identityManager.close()
  }

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation(): Promise<InvitationDescriptor> {
    log(`Create invitation`)
    const identity = this.identityManager.identity ?? failUndefined()

    const swarmKey = PublicKey.random()
    this.networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: swarmKey,
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [new PluginRpc(async (port) => {
        log(`Inviter connected`)
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
                log(`Admit device`, { deviceKey })
                await identity.controlPipeline.writer.write({
                  '@type': 'dxos.echo.feed.CredentialsMessage',
                  credential: await identity.getIdentityCredentialSigner().createCredential({
                    subject: deviceKey,
                    assertion: {
                      "@type": 'dxos.halo.credentials.AuthorizedDevice',
                      identityKey: identity.identityKey,
                      deviceKey: deviceKey,
                    }
                  })
                });
                // TODO(dmaretskyi): We'd also need to admit device2's feeds otherwise messages from them won't be processed by the pipeline.

              }
            }
          },
          port
        })

        await peer.open()
        log(`Inviter RPC open`)

        await peer.rpc.InviteeInvitationService.acceptIdenity({
          identityKey: identity.identityKey,
          haloSpaceKey: identity.haloSpaceKey,
          genesisFeedKey: identity.haloGenesisFeedKey
        })
      })])
    })

    return new InvitationDescriptor(InvitationDescriptorProto.Type.INTERACTIVE, swarmKey.asUint8Array(), new Uint8Array());
  }


  /**
   * Joins an existing identity HALO by invitation.
   */
  async join(invitationDescriptor: InvitationDescriptor) {
    const swarmKey = PublicKey.from(invitationDescriptor.swarmKey)

    const done = new Trigger()

    this.networkManager.joinProtocolSwarm({
      topic: swarmKey,
      peerId: PublicKey.random(),
      topology: new StarTopology(swarmKey),
      protocol: createProtocolFactory(swarmKey, swarmKey, [new PluginRpc(async (port) => {
        log(`Invitee connected`)
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

                  log(`Accept identity`, { identityKey, haloSpaceKey, genesisFeedKey })

                  const identity = await this.identityManager.acceptIdentity({
                    identityKey: identityKey,
                    haloSpaceKey: haloSpaceKey,
                    haloGenesisFeedKey: genesisFeedKey
                  })

                  log(`Try to admit device`)
                  await peer.rpc.InviterInvitationService.admitDevice({
                    deviceKey: identity.deviceKey,
                    // TODO(dmaretskyi): .
                    controlFeedKey: PublicKey.random(),
                    dataFeedKey: PublicKey.random(),
                  })

                  log(`Waiting for identity to be ready`)
                  await identity.ready()

                  done.wake()
                  log(`Invitee done`)
                } catch (err: any) {
                  log.catch(err)
                }
              }
            },
          },
          port
        })

        await peer.open()
        log(`Invitee RPC open`)
      })])
    })

    await done.wait()

    return this.identityManager.identity ?? failUndefined()
  }
}