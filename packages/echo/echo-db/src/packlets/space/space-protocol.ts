//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { discoveryKey } from '@dxos/crypto';
import { Protocol } from '@dxos/mesh-protocol';
import { MMSTTopology, NetworkManager, Plugin } from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { PublicKey } from '@dxos/protocols';

import { AuthPlugin } from './auth-plugin';

// TODO(dmaretskyi): Move these two to auth plugin.
export type CredentialProvider = (nonce: Uint8Array) => Promise<Uint8Array | undefined>;

// TODO(dmaretskyi): This can return information about peer identity.
export type CredentialAuthenticator = (nonce: Uint8Array, credential: Uint8Array) => Promise<boolean>;

// TODO(burdon): Move/remove?
export const MOCK_CREDENTIAL_PROVIDER: CredentialProvider = async (nonce: Uint8Array) => Buffer.from('mock');
export const MOCK_CREDENTIAL_AUTHENTICATOR: CredentialAuthenticator = async (nonce: Uint8Array, credential: Uint8Array) => true;

export interface SwarmIdentity {
  peerKey: PublicKey
  credentialProvider: CredentialProvider
  credentialAuthenticator: CredentialAuthenticator
}

export class SpaceProtocol {
  private readonly _presence: PresencePlugin;
  private readonly _authenticator: AuthPlugin;

  readonly authenticationFailed: Event;

  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _topic: PublicKey,
    private readonly _swarmIdentity: SwarmIdentity,
    private readonly _plugins: Plugin[]
  ) {
    this._presence = new PresencePlugin(this._swarmIdentity.peerKey.asBuffer());
    this._authenticator = new AuthPlugin(this._swarmIdentity, []); // Enabled for all protocol extensions.
    this.authenticationFailed = this._authenticator.authenticationFailed;
  }

  async start () {
    // TODO(burdon): Move to config (with sensible defaults).
    const topologyConfig = {
      originateConnections: 4,
      maxPeers: 10,
      sampleSize: 20
    };

    const credentials = await this._swarmIdentity.credentialProvider(Buffer.from(''));

    this._networkManager.joinProtocolSwarm({
      protocol: ({ channel, initiator }) => this._createProtocol(credentials, { channel, initiator }),
      peerId: this._swarmIdentity.peerKey,
      topic: this._topic,
      presence: this._presence,
      topology: new MMSTTopology(topologyConfig),
      label: `Protocol swarm: ${this._topic}`
    });
  }

  async stop () {
    await this._networkManager.leaveProtocolSwarm(this._topic);
  }

  private _createProtocol (credentials: Uint8Array | undefined, { initiator, channel }: { initiator: boolean, channel: Buffer }) {
    const plugins: Plugin[] = [
      this._presence,
      this._authenticator,
      ...this._plugins
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
        credentials: credentials ? Buffer.from(credentials).toString('hex') : undefined
      },

      initiator
    });

    protocol
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init();

    return protocol;
  }

  get peers () {
    return this._presence.peers.map(peer => PublicKey.from(peer));
  }
}
