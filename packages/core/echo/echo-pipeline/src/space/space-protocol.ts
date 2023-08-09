//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { discoveryKey, subtleCrypto } from '@dxos/crypto';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import {
  MMSTTopology,
  NetworkManager,
  SwarmConnection,
  WireProtocol,
  WireProtocolParams,
  WireProtocolProvider,
} from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { MuxerStats, Teleport } from '@dxos/teleport';
import { BlobStore, BlobSync } from '@dxos/teleport-extension-object-sync';
import { ReplicatorExtension } from '@dxos/teleport-extension-replicator';
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
  swarmIdentity: SwarmIdentity;
  networkManager: NetworkManager;

  blobStore: BlobStore;

  /**
   * Called when new session is authenticated.
   * Additional extensions can be added here.
   */
  onSessionAuth?: (session: Teleport) => void;
  onAuthFailure?: (session: Teleport) => void;
};

/**
 * Manages Teleport protocol stream creation and joining swarms with replication and presence extensions.
 */
export class SpaceProtocol {
  private readonly _networkManager: NetworkManager;
  private readonly _swarmIdentity: SwarmIdentity;
  private readonly _onSessionAuth?: (session: Teleport) => void;
  private readonly _onAuthFailure?: (session: Teleport) => void;

  public readonly blobSync: BlobSync;

  @logInfo
  private readonly _topic: Promise<PublicKey>;

  private readonly _feeds = new Set<FeedWrapper<FeedMessage>>();
  private readonly _sessions = new ComplexMap<PublicKey, SpaceProtocolSession>(PublicKey.hash);

  private _connection?: SwarmConnection;

  get sessions(): ReadonlyMap<PublicKey, SpaceProtocolSession> {
    return this._sessions;
  }

  get feeds(): ReadonlySet<FeedWrapper<FeedMessage>> {
    return this._feeds;
  }

  @logInfo
  private get _ownPeerKey() {
    return this._swarmIdentity.peerKey;
  }

  constructor({ topic, swarmIdentity, networkManager, onSessionAuth, onAuthFailure, blobStore }: SpaceProtocolOptions) {
    this._networkManager = networkManager;
    this._swarmIdentity = swarmIdentity;
    this._onSessionAuth = onSessionAuth;
    this._onAuthFailure = onAuthFailure;
    this.blobSync = new BlobSync({ blobStore });

    this._topic = subtleCrypto.digest('SHA-256', topic.asBuffer()).then(discoveryKey).then(PublicKey.from);
  }

  // TODO(burdon): Create abstraction for Space (e.g., add keys and have provider).
  addFeed(feed: FeedWrapper<FeedMessage>) {
    log('addFeed', { key: feed.key });

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
      sampleSize: 20,
    };

    await this.blobSync.open();

    log('starting...');
    this._connection = await this._networkManager.joinSwarm({
      protocolProvider: this._createProtocolProvider(credentials),
      peerId: this._swarmIdentity.peerKey,
      topic: await this._topic,
      topology: new MMSTTopology(topologyConfig),
      label: `Protocol swarm: ${this._topic}`,
    });

    log('started');
  }

  async stop() {
    await this.blobSync.close();

    if (this._connection) {
      log('stopping...');
      await this._connection.close();
      log('stopped');
    }
  }

  private _createProtocolProvider(credentials: Uint8Array | undefined): WireProtocolProvider {
    return (wireParams) => {
      const session = new SpaceProtocolSession({
        wireParams,
        swarmIdentity: this._swarmIdentity,
        onSessionAuth: this._onSessionAuth,
        onAuthFailure: this._onAuthFailure,
        blobSync: this.blobSync,
      });
      this._sessions.set(wireParams.remotePeerId, session);

      for (const feed of this._feeds) {
        session.replicator.addFeed(feed);
      }

      return session;
    };
  }
}

export type SpaceProtocolSessionParams = {
  wireParams: WireProtocolParams;
  swarmIdentity: SwarmIdentity;

  blobSync: BlobSync;

  /**
   * Called when new session is authenticated.
   * Additional extensions can be added here.
   */
  onSessionAuth?: (session: Teleport) => void;

  onAuthFailure?: (session: Teleport) => void;
};

export enum AuthStatus {
  INITIAL = 'INITIAL',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

// TODO(dmaretskyi): Move to a separate file.
/**
 * Represents a single connection to a remote peer
 */
export class SpaceProtocolSession implements WireProtocol {
  @logInfo
  private readonly _wireParams: WireProtocolParams;

  private readonly _onSessionAuth?: (session: Teleport) => void;
  private readonly _onAuthFailure?: (session: Teleport) => void;
  private readonly _swarmIdentity: SwarmIdentity;
  private readonly _blobSync: BlobSync;

  private readonly _teleport: Teleport;

  // TODO(dmaretskyi): Start with upload=false when switching it on the fly works.
  public readonly replicator = new ReplicatorExtension().setOptions({ upload: true });

  private _authStatus = AuthStatus.INITIAL;

  @logInfo
  get authStatus() {
    return this._authStatus;
  }

  get stats(): Event<MuxerStats> {
    return this._teleport.stats;
  }

  // TODO(dmaretskyi): Allow to pass in extra extensions.
  constructor({ wireParams, swarmIdentity, onSessionAuth, onAuthFailure, blobSync }: SpaceProtocolSessionParams) {
    this._wireParams = wireParams;
    this._swarmIdentity = swarmIdentity;
    this._onSessionAuth = onSessionAuth;
    this._onAuthFailure = onAuthFailure;
    this._blobSync = blobSync;

    this._teleport = new Teleport(wireParams);
  }

  get stream() {
    return this._teleport.stream;
  }

  async initialize(): Promise<void> {
    await this._teleport.open();
    this._teleport.addExtension(
      'dxos.mesh.teleport.auth',
      new AuthExtension({
        provider: this._swarmIdentity.credentialProvider,
        verifier: this._swarmIdentity.credentialAuthenticator,
        onAuthSuccess: () => {
          log('Peer authenticated');
          this._authStatus = AuthStatus.SUCCESS;
          this._onSessionAuth?.(this._teleport);
          // TODO(dmaretskyi): Configure replicator to upload.
        },
        onAuthFailure: () => {
          this._authStatus = AuthStatus.FAILURE;
          this._onAuthFailure?.(this._teleport);
        },
      }),
    );
    this._teleport.addExtension('dxos.mesh.teleport.replicator', this.replicator);
    this._teleport.addExtension('dxos.mesh.teleport.blobsync', this._blobSync.createExtension());
  }

  async destroy(): Promise<void> {
    await this._teleport.close();
  }
}
