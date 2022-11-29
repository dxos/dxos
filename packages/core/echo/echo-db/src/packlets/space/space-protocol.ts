//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { discoveryKey, sha256 } from '@dxos/crypto';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import {
  adaptProtocolProvider,
  MMSTTopology,
  NetworkManager,
  Plugin,
  SwarmConnection,
  WireProtocol,
  WireProtocolParams,
  WireProtocolProvider
} from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Teleport } from '@dxos/teleport';
import { ReplicatorExtension as TeleportReplicatorExtension } from '@dxos/teleport-plugin-replicator';
import { ComplexMap } from '@dxos/util';

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

export const USE_TELEPORT = false;

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

  // Teleport-specific
  private _feeds = new Set<FeedWrapper<FeedMessage>>();
  private _sessions = new ComplexMap<PublicKey, SpaceProtocolSession>(PublicKey.hash);

  constructor({ topic, identity, networkManager, plugins = [] }: SpaceProtocolOptions) {
    this._networkManager = networkManager;
    this._swarmIdentity = identity;

    // Plugins
    this._presencePlugin = new PresencePlugin(this._swarmIdentity.peerKey.asBuffer());
    this._authPlugin = new AuthPlugin(this._swarmIdentity, []); // Enabled for all protocol extensions.
    this._customPlugins = plugins;

    this._discoveryKey = PublicKey.from(discoveryKey(sha256(topic.toHex())));
    this._peerId = PublicKey.from(discoveryKey(sha256(this._swarmIdentity.peerKey.toHex())));

    this.authenticationFailed = this._authPlugin.authenticationFailed;
  }

  // TODO(burdon): Create abstraction for Space (e.g., add keys and have provider).
  addFeed(feed: FeedWrapper<FeedMessage>) {
    if (USE_TELEPORT) {
      this._feeds.add(feed);
      for (const session of this._sessions.values()) {
        session.replicator.addFeed(feed);
      }
    } else {
      this._replicator.addFeed(feed);
    }
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
      protocolProvider: this._createProtocolProvider(credentials),
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

  private _createProtocolProvider(credentials: Uint8Array | undefined): WireProtocolProvider {
    if (USE_TELEPORT) {
      return (params) => {
        const session = new SpaceProtocolSession(params);
        this._sessions.set(params.remotePeerId, session);

        for (const feed of this._feeds) {
          session.replicator.addFeed(feed);
        }

        return session;
      };
    } else { // TODO(dmaretskyi): Remove once the transition is over.
      return adaptProtocolProvider(({ channel, initiator }) => {
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
      });
    }
  }

  get peers() {
    return this._presencePlugin.peers.map((peer) => PublicKey.from(peer));
  }
}

// TODO(dmaretskyi): Move to a separate file.
/**
 * Represents a single connection to a remote peer
 */
export class SpaceProtocolSession implements WireProtocol {
  private readonly _teleport: Teleport;

  // TODO(dmaretskyi): Start with upload=false when switching it on the fly works.
  public readonly replicator = new TeleportReplicatorExtension().setOptions({ upload: true });

  // TODO(dmaretskyi): Allow to pass in extra extensions.
  constructor({ initiator, localPeerId, remotePeerId }: WireProtocolParams) {
    this._teleport = new Teleport({ initiator, localPeerId, remotePeerId });
  }

  get stream() {
    return this._teleport.stream;
  }

  async initialize(): Promise<void> {
    await this._teleport.open();
    this._teleport.addExtension('dxos.mesh.teleport.replicator', this.replicator);
  }

  async destroy(): Promise<void> {
    await this._teleport.close();
  }
}
