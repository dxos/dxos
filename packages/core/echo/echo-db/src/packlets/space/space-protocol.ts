//
// Copyright 2022 DXOS.org
//

import { discoveryKey, sha256 } from '@dxos/crypto';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import {
  MMSTTopology,
  NetworkManager,
  SwarmConnection,
  WireProtocol,
  WireProtocolParams,
  WireProtocolProvider
} from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Teleport } from '@dxos/teleport';
import { ReplicatorExtension as TeleportReplicatorExtension } from '@dxos/teleport-extension-replicator';
import { ComplexMap } from '@dxos/util';

import { AuthExtension, AuthProvider, AuthVerifier } from './auth';

export const MOCK_AUTH_PROVIDER: AuthProvider = async (nonce: Uint8Array) => Buffer.from('mock');
export const MOCK_AUTH_VERIFIER: AuthVerifier = async (nonce: Uint8Array, credential: Uint8Array) => true;

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
};

/**
 * Manages Teleport protocol stream creation and joining swarms with replication and presence extensions.
 */
export class SpaceProtocol {
  private readonly _networkManager: NetworkManager;
  private readonly _swarmIdentity: SwarmIdentity;

  private readonly _discoveryKey: PublicKey;
  private readonly _peerId: PublicKey;

  private _connection?: SwarmConnection;

  private _feeds = new Set<FeedWrapper<FeedMessage>>();
  private _sessions = new ComplexMap<PublicKey, SpaceProtocolSession>(PublicKey.hash);

  get sessions(): ReadonlyMap<PublicKey, SpaceProtocolSession> {
    return this._sessions;
  }

  // TODO(dmaretskyi): Remove once we set peerId = swarmIdentity.peerKey.
  get peerId() {
    return this._peerId;
  }

  constructor({ topic, identity, networkManager }: SpaceProtocolOptions) {
    this._networkManager = networkManager;
    this._swarmIdentity = identity;

    this._discoveryKey = PublicKey.from(discoveryKey(sha256(topic.toHex())));
    this._peerId = PublicKey.from(discoveryKey(sha256(this._swarmIdentity.peerKey.toHex())));
  }

  // TODO(burdon): Create abstraction for Space (e.g., add keys and have provider).
  addFeed(feed: FeedWrapper<FeedMessage>) {
    this._feeds.add(feed);
    for (const session of this._sessions.values()) {
      session.replicator.addFeed(feed);
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
    return (wireParams) => {
      const session = new SpaceProtocolSession({ wireParams, swarmIdentity: this._swarmIdentity });
      this._sessions.set(wireParams.remotePeerId, session);

      for (const feed of this._feeds) {
        session.replicator.addFeed(feed);
      }

      return session;
    };
  }

  get peers() {
    return [];
  }
}

export type SpaceProtocolSessionParams = {
  wireParams: WireProtocolParams;
  swarmIdentity: SwarmIdentity;
};

export enum AuthStatus {
  INITIAL = 'INITIAL',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

// TODO(dmaretskyi): Move to a separate file.
/**
 * Represents a single connection to a remote peer
 */
export class SpaceProtocolSession implements WireProtocol {
  @logInfo
  private readonly _wireParams: WireProtocolParams;

  private readonly _swarmIdentity: SwarmIdentity;

  private readonly _teleport: Teleport;

  // TODO(dmaretskyi): Start with upload=false when switching it on the fly works.
  public readonly replicator = new TeleportReplicatorExtension().setOptions({ upload: true });

  private _authStatus = AuthStatus.INITIAL;

  @logInfo
  get authStatus() {
    return this._authStatus;
  }

  // TODO(dmaretskyi): Allow to pass in extra extensions.
  constructor({ wireParams, swarmIdentity }: SpaceProtocolSessionParams) {
    this._wireParams = wireParams;
    this._swarmIdentity = swarmIdentity;

    this._teleport = new Teleport(wireParams);
  }

  get stream() {
    return this._teleport.stream;
  }

  async initialize(): Promise<void> {
    await this._teleport.open();
    this._teleport.addExtension('dxos.mesh.teleport.replicator', this.replicator);
    this._teleport.addExtension(
      'dxos.mesh.teleport.auth',
      new AuthExtension({
        provider: this._swarmIdentity.credentialProvider,
        verifier: this._swarmIdentity.credentialAuthenticator,
        onAuthSuccess: () => {
          this._authStatus = AuthStatus.SUCCESS;
          log('Peer authenticated');
          // TODO(dmaretskyi): Add auth-only plugins: Presence, Greeter (feed admission).
          // TODO(dmaretskyi): Configure replicator to upload.
        },
        onAuthFailure: () => {
          log.warn('Auth failed');
          this._authStatus = AuthStatus.FAILURE;
        }
      })
    );
  }

  async destroy(): Promise<void> {
    await this._teleport.close();
  }
}
