import { todo } from "@dxos/debug";
import { MMSTTopology, NetworkManager, Plugin } from "@dxos/network-manager";
import { PublicKey } from "@dxos/protocols";
import { PresencePlugin } from "@dxos/protocol-plugin-presence";
import { Protocol } from "@dxos/mesh-protocol";
import { discoveryKey } from "@dxos/crypto";

// TODO(dmaretskyi): Move these two to auth plugin.
export type CredentialProvider = (nonce: Uint8Array) => Promise<Uint8Array>;

// TODO(dmaretskyi): This can return information about peer identity.
export type CredentialAuthenticator = (nonce: Uint8Array, credential: Uint8Array) => Promise<boolean>;

export interface SwarmIdentity {
  peerKey: PublicKey
  credentialProvider: CredentialProvider
  credentialAuthenticator: CredentialAuthenticator
}

export class SpaceProtocol {
  private readonly _presence: PresencePlugin;

  constructor(
    private readonly _networkManager: NetworkManager,
    private readonly _topic: PublicKey,
    private readonly _swarmIdentity: SwarmIdentity,
    private readonly _plugins: Plugin[]
  ) {
    this._presence = new PresencePlugin(this._swarmIdentity.peerKey.asBuffer());
  }

  async start() {
    // TODO(burdon): Move to config (with sensible defaults).
    const topologyConfig = {
      originateConnections: 4,
      maxPeers: 10,
      sampleSize: 20
    };

    this._networkManager.joinProtocolSwarm({
      protocol: ({ channel, initiator }) => this._createProtocol({ channel, initiator }),
      peerId: this._swarmIdentity.peerKey,
      topic: this._topic,
      presence: this._presence,
      topology: new MMSTTopology(topologyConfig),
      label: `Protocol swarm: ${this._topic}`
    })
  }

  async stop() {
    this._networkManager.leaveProtocolSwarm(this._topic);
  }

  private _createProtocol ({ initiator, channel }: { initiator: boolean, channel: Buffer }) {
    const plugins: Plugin[] = [
      this._presence,
      // TODO: Add auth plugin.
      ...this._plugins,
    ];

    const protocol = new Protocol({
      streamOptions: {
        live: true
      },

      discoveryKey: channel,

      discoveryToPublicKey: (dk: any) => {
        if (!discoveryKey(this._topic.asBuffer()).equals(dk)) {
          return undefined;
        }

        // TODO(dmaretskyi): Why does this do side effects?
        // TODO(burdon): Remove need for external closure (ie, pass object to this callback).
        protocol.setContext({ topic: this._topic.toHex() });

        // TODO(burdon): IMPORTANT: inconsistent use of toHex and asBuffer.
        //  - Need to progressively clean-up all uses of Keys via Typescript.
        return this._topic.asBuffer();
      },

      userSession: {
        // TODO(burdon): See deprecated `protocolFactory` in HALO.
        peerId: this._swarmIdentity.peerKey.toHex(),
        // TODO(telackey): This ought to be the CredentialsProvider itself, so that fresh credentials can be minted.
        credentials: ''
      },

      initiator,
    });

    protocol
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init();

    return protocol;
  }

  get peers() {
    return this._presence.peers.map(peer => PublicKey.from(peer));
  }
}

export const MOCK_CREDENTIAL_PROVIDER: CredentialProvider = async (nonce: Uint8Array) => Buffer.from('mock')
export const MOCK_CREDENTIAL_AUTHENTICATOR: CredentialAuthenticator = async (nonce: Uint8Array, credential: Uint8Array) => true