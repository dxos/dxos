//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { discoveryKey, sha256 } from '@dxos/crypto';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import { MMSTTopology, NetworkManager, Plugin, SwarmConnection } from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

import { AuthPlugin, AuthVerifier, AuthProvider } from './auth-plugin';
import { ReplicatorPlugin } from './replicator-plugin';

// TODO(burdon): Reconcile with SigningContext (define types together).
export interface SwarmIdentity {
  peerKey: PublicKey;
  credentialProvider: AuthProvider;
  credentialAuthenticator: AuthVerifier;
}

export type SpaceProtocolOptions = {
  topic: PublicKey; // TODO(burdon): Rename?
  identity: SwarmIdentity;
  networkManager: NetworkManager;
  plugins?: Plugin[];
};

/**
 * Manages hypercore protocol stream creation and joining swarms.
 */
export class SpaceProtocol {
  private readonly _replicator = new ReplicatorPlugin();
  private readonly _customPlugins: Plugin[];

  private readonly _networkManager: NetworkManager;
  private readonly _swarmIdentity: SwarmIdentity;

  private readonly _presencePlugin: PresencePlugin;
  private readonly _authPlugin: AuthPlugin;
  private readonly _discoveryKey: PublicKey;
  private readonly _peerId: PublicKey;

  readonly authenticationFailed: Event;

  private _connection?: SwarmConnection;

  constructor({ topic, identity, networkManager, plugins = [] }: SpaceProtocolOptions) {
    this._networkManager = networkManager;

    // Plugins
    this._swarmIdentity = identity;
    this._presencePlugin = new PresencePlugin(this._swarmIdentity.peerKey.asBuffer());
    this._authPlugin = new AuthPlugin(this._swarmIdentity, []); // Enabled for all protocol extensions.
    this._customPlugins = plugins;

    this._discoveryKey = PublicKey.from(discoveryKey(sha256(topic.toHex())));
    this._peerId = PublicKey.from(discoveryKey(sha256(this._swarmIdentity.peerKey.toHex())));

    this.authenticationFailed = this._authPlugin.authenticationFailed;
  }

  // TODO(burdon): Create abstraction for Space (e.g., add keys and have provider).
  addFeed(feed: FeedWrapper<FeedMessage>) {
    this._replicator.addFeed(feed);
  }

  async start() {
    if (this._connection) {
      return;
    }

    // TODO(burdon): Document why empty buffer.
    const credentials = await this._swarmIdentity.credentialProvider(Buffer.from(''));

    // TODO(burdon): Move to config (with sensible defaults).
    const topologyConfig = {
      originateConnections: 4,
      maxPeers: 10,
      sampleSize: 20
    };

    log('starting...');
    this._connection = await this._networkManager.joinSwarm({
      protocol: ({ channel, initiator }) => this._createProtocol(credentials, { channel, initiator }),
      peerId: this._peerId,
      topic: this._discoveryKey,
      presence: this._presencePlugin,
      topology: new MMSTTopology(topologyConfig),
      label: `Protocol swarm: ${this._discoveryKey}`
    });

    log('started');
  }

  async stop() {
    if (this._connection) {
      log('stopping...');
      await this._connection.close();
      log('stopped');
    }
  }

  private _createProtocol(
    credentials: Uint8Array | undefined,
    { initiator, channel }: { initiator: boolean; channel: Buffer }
  ) {
    const protocol = new Protocol({
      streamOptions: {
        live: true
      },

      discoveryKey: channel,
      discoveryToPublicKey: (discoveryKey: any) => {
        if (!PublicKey.from(discoveryKey).equals(this._discoveryKey)) {
          return undefined;
        }

        // TODO(dmaretskyi): Why does this do side effects?
        // TODO(burdon): Remove need for external closure (ie, pass object to this callback).
        protocol.setContext({ topic: this._discoveryKey.toHex() });
        // TODO(burdon): Inconsistent use of toHex vs asBuffer?
        return this._discoveryKey.asBuffer();
      },

      userSession: {
        // TODO(burdon): See deprecated `protocolFactory` in HALO.
        peerId: this._peerId.toHex(),
        // TODO(telackey): This ought to be the CredentialsProvider itself, so that fresh credentials can be minted.
        credentials: credentials ? Buffer.from(credentials).toString('base64') : undefined
      },

      initiator
    });

    const plugins: Plugin[] = [this._presencePlugin, this._authPlugin, this._replicator, ...this._customPlugins];
    protocol.setExtensions(plugins.map((plugin) => plugin.createExtension())).init();

    return protocol;
  }

  get peers() {
    return this._presencePlugin.peers.map((peer) => PublicKey.from(peer));
  }
}
