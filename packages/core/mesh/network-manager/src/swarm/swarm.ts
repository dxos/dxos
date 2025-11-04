//
// Copyright 2020 DXOS.org
//

import { Event, scheduleTask, sleep, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { type ListeningHandle, type Messenger, type PeerInfo, PeerInfoHash, type SwarmEvent } from '@dxos/messaging';
import { trace } from '@dxos/protocols';
import { type Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap, isNonNullable } from '@dxos/util';

import { type OfferMessage, type SignalMessage, SwarmMessenger } from '../signal';
import { type SwarmController, type Topology } from '../topology';
import { type TransportFactory } from '../transport';
import { type Topic } from '../types';
import { type WireProtocolProvider } from '../wire-protocol';

import { type Connection, ConnectionState } from './connection';
import { type ConnectionLimiter } from './connection-limiter';
import { Peer } from './peer';

const INITIATION_DELAY = 100;

// TODO(burdon): Factor out.
const getClassName = (obj: any) => Object.getPrototypeOf(obj).constructor.name;

/**
 * A single peer's view of the swarm.
 * Manages a set of peers subscribed on the same topic.
 * Routes signal events and maintains swarm topology.
 */
export class Swarm {
  private readonly _swarmMessenger: SwarmMessenger;

  private _ctx = new Context();

  private _listeningHandle?: ListeningHandle = undefined;

  /**
   * PeerInfo -> Peer.
   * @internal
   */
  readonly _peers = new ComplexMap<PeerInfo, Peer>(PeerInfoHash);

  /**
   * Unique id of the swarm, local to the current peer, generated when swarm is joined.
   */
  @logInfo
  readonly _instanceId = PublicKey.random().toHex();

  /**
   * New connection to a peer is started.
   * @internal
   */
  readonly connectionAdded = new Event<Connection>();

  /**
   * Connection to a peer is dropped.
   * @internal
   */
  readonly disconnected = new Event<PeerInfo>();

  /**
   * Connection is established to a new peer.
   * @internal
   */
  readonly connected = new Event<PeerInfo>();

  readonly errors = new ErrorStream();

  // TODO(burdon): Swarm => Peer.create/destroy =< Connection.open/close

  // TODO(burdon): Pass in object.
  constructor(
    private readonly _topic: PublicKey,
    private readonly _ownPeer: PeerInfo,
    private _topology: Topology,
    private readonly _protocolProvider: WireProtocolProvider,
    private readonly _messenger: Messenger,
    private readonly _transportFactory: TransportFactory,
    private readonly _label: string | undefined,
    private readonly _connectionLimiter: ConnectionLimiter,
    private readonly _initiationDelay = INITIATION_DELAY,
  ) {
    log.trace(
      'dxos.mesh.swarm.constructor',
      trace.begin({ id: this._instanceId, data: { topic: this._topic.toHex(), peer: this._ownPeer } }),
    );
    log('creating swarm', { peerId: _ownPeer });
    _topology.init(this._getSwarmController());

    this._swarmMessenger = new SwarmMessenger({
      sendMessage: async (msg) => await this._messenger.sendMessage(msg),
      onSignal: async (msg) => await this.onSignal(msg),
      onOffer: async (msg) => await this.onOffer(msg),
      topic: this._topic,
    });
    log.trace('dxos.mesh.swarm.constructor', trace.end({ id: this._instanceId }));
  }

  get connections() {
    return Array.from(this._peers.values())
      .map((peer) => peer.connection)
      .filter(isNonNullable);
  }

  get ownPeerId() {
    return PublicKey.from(this._ownPeer.peerKey);
  }

  @logInfo
  get ownPeer() {
    return this._ownPeer;
  }

  /**
   * Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.
   */
  get label(): string | undefined {
    return this._label;
  }

  @logInfo
  get topic(): Topic {
    return this._topic;
  }

  async open(): Promise<void> {
    invariant(!this._listeningHandle);
    this._listeningHandle = await this._messenger.listen({
      peer: this._ownPeer,
      payloadType: 'dxos.mesh.swarm.SwarmMessage',
      onMessage: async (message) => {
        await this._swarmMessenger
          .receiveMessage(message)
          // TODO(nf): discriminate between errors
          .catch((err) => log.info('Error while receiving message', { err }));
      },
    });
  }

  async destroy(): Promise<void> {
    log('destroying...');
    await this._listeningHandle?.unsubscribe();
    this._listeningHandle = undefined;

    await this._ctx.dispose();
    await this._topology.destroy();
    await Promise.all(Array.from(this._peers.keys()).map((key) => this._destroyPeer(key, 'swarm destroyed')));
    log('destroyed');
  }

  async setTopology(topology: Topology): Promise<void> {
    invariant(!this._ctx.disposed, 'Swarm is offline');
    if (topology === this._topology) {
      return;
    }
    log('setting topology', {
      previous: getClassName(this._topology),
      topology: getClassName(topology),
    });

    await this._topology.destroy();
    this._topology = topology;
    this._topology.init(this._getSwarmController());
    this._topology.update();
  }

  @synchronized
  async onSwarmEvent(swarmEvent: SwarmEvent): Promise<void> {
    log('swarm event', { swarmEvent }); // TODO(burdon): Stringify.

    if (this._ctx.disposed) {
      log('swarm event ignored for disposed swarm');
      return;
    }

    if (swarmEvent.peerAvailable) {
      const peerId = swarmEvent.peerAvailable.peer.peerKey;
      if (peerId !== this._ownPeer.peerKey) {
        log('new peer', { peerId });
        const peer = this._getOrCreatePeer(swarmEvent.peerAvailable.peer);
        peer.advertizing = true;
      }
    } else if (swarmEvent.peerLeft) {
      const peer = this._peers.get(swarmEvent.peerLeft.peer);
      if (peer) {
        peer.advertizing = false;
        // Destroy peer only if there is no p2p-connection established. Otherwise, let peers go through
        // the graceful shutdown protocol.
        if (this._isConnectionEstablishmentInProgress(peer)) {
          log(`destroying peer, state: ${peer.connection?.state}`);
          void this._destroyPeer(swarmEvent.peerLeft.peer, 'peer left').catch((err) => log.catch(err));
        }
      } else {
        log('received peerLeft but no peer found', { peer: swarmEvent.peerLeft.peer.peerKey });
      }
    }

    this._topology.update();
  }

  @synchronized
  async onOffer(message: OfferMessage): Promise<Answer> {
    log('offer', { message });
    if (this._ctx.disposed) {
      log('ignored for disposed swarm');
      return { accept: false };
    }

    // Id of the peer offering us the connection.
    invariant(message.author);
    if (message.recipient.peerKey !== this._ownPeer.peerKey) {
      log('rejecting offer with incorrect peerId', { message });
      return { accept: false };
    }
    if (!message.topic?.equals(this._topic)) {
      log('rejecting offer with incorrect topic', { message });
      return { accept: false };
    }

    const peer = this._getOfferSenderPeer(message.author);
    const answer = await peer.onOffer(message);
    this._topology.update();
    return answer;
  }

  private _getOfferSenderPeer(senderInfo: PeerInfo): Peer {
    const peer = this._getOrCreatePeer(senderInfo);

    // Handle fast peer reconnect (eg. tab reload)
    const connectionState = peer.connection?.state;
    if (connectionState === ConnectionState.CLOSING || connectionState === ConnectionState.ABORTING) {
      this._peers.delete(peer.remoteInfo);
      this.disconnected.emit(peer.remoteInfo);
      return this._getOrCreatePeer(peer.remoteInfo);
    }

    return peer;
  }

  async onSignal(message: SignalMessage): Promise<void> {
    log('signal', { message });
    if (this._ctx.disposed) {
      log.info('ignored for offline swarm');
      return;
    }
    invariant(
      message.recipient.peerKey === this._ownPeer.peerKey,
      `Invalid signal peer id expected=${this.ownPeerId}, actual=${message.recipient}`,
    );
    invariant(message.topic?.equals(this._topic));
    invariant(message.author);

    const peer = this._getOrCreatePeer(message.author);
    await peer.onSignal(message);
  }

  // For debug purposes
  @synchronized
  async goOffline(): Promise<void> {
    await this._ctx.dispose();
    await Promise.all([...this._peers.keys()].map((peerId) => this._destroyPeer(peerId, 'goOffline')));
  }

  // For debug purposes
  @synchronized
  async goOnline(): Promise<void> {
    this._ctx = new Context();
  }

  private _getOrCreatePeer(peerInfo: PeerInfo): Peer {
    invariant(peerInfo.peerKey, 'PeerInfo.peerKey is required');
    let peer = this._peers.get(peerInfo);
    if (!peer) {
      peer = new Peer(
        peerInfo,
        this._topic,
        this._ownPeer,
        this._swarmMessenger,
        this._protocolProvider,
        this._transportFactory,
        this._connectionLimiter,
        {
          onInitiated: (connection) => {
            this.connectionAdded.emit(connection);
          },
          onConnected: () => {
            this.connected.emit(peerInfo);
          },
          onDisconnected: async () => {
            if (this._isUnregistered(peer)) {
              log.verbose('ignored onDisconnected for unregistered peer');
              return;
            }
            if (!peer!.advertizing) {
              await this._destroyPeer(peerInfo, 'peer disconnected');
            }

            this.disconnected.emit(peerInfo);
            this._topology.update();
          },
          onRejected: () => {
            // If the peer rejected our connection remove it from the set of candidates.
            // TODO(dmaretskyi): Set flag instead.
            if (!this._isUnregistered(peer)) {
              log('peer rejected connection', { peerInfo });
              void this._destroyPeer(peerInfo, 'peer rejected connection');
            }
          },
          onAccepted: () => {
            this._topology.update();
          },
          onOffer: (remoteId) => this._topology.onOffer(PublicKey.from(remoteId.peerKey)),
          onPeerAvailable: () => {
            this._topology.update();
          },
        },
      );
      this._peers.set(peerInfo, peer);
    }

    return peer;
  }

  private async _destroyPeer(peerInfo: PeerInfo, reason?: string): Promise<void> {
    log('destroy peer', { peerKey: peerInfo.peerKey, reason });
    const peer = this._peers.get(peerInfo);
    invariant(peer);
    this._peers.delete(peerInfo);
    await peer.safeDestroy(reason);
  }

  private _getSwarmController(): SwarmController {
    return {
      getState: () => ({
        ownPeerId: PublicKey.from(this._ownPeer.peerKey),
        connected: Array.from(this._peers.entries())
          .filter(([_, peer]) => peer.connection)
          .map(([info]) => PublicKey.from(info.peerKey)),
        candidates: Array.from(this._peers.entries())
          .filter(([_, peer]) => !peer.connection && peer.advertizing && peer.availableToConnect)
          .map(([info]) => PublicKey.from(info.peerKey)),
        allPeers: Array.from(this._peers.keys()).map((info) => PublicKey.from(info.peerKey)),
      }),
      connect: (peer) => {
        if (this._ctx.disposed) {
          return;
        }

        // Run in a separate non-blocking task.
        scheduleTask(this._ctx, async () => {
          try {
            await this._initiateConnection({ peerKey: peer.toHex() });
          } catch (err: any) {
            log('initiation error', err);
          }
        });
      },
      disconnect: async (peer) => {
        if (this._ctx.disposed) {
          return;
        }

        // Run in a separate non-blocking task.
        scheduleTask(this._ctx, async () => {
          await this._closeConnection({ peerKey: peer.toHex() });
          this._topology.update();
        });
      },
    };
  }

  /**
   * Creates a connection then sends message over signal network.
   */
  private async _initiateConnection(remotePeer: PeerInfo): Promise<void> {
    const ctx = this._ctx; // Copy to avoid getting reset while sleeping.

    // It is likely that the other peer will also try to connect to us at the same time.
    // If our peerId is higher, we will wait for a bit so that other peer has a chance to connect first.
    const peer = this._getOrCreatePeer(remotePeer);
    if (remotePeer.peerKey < this._ownPeer.peerKey) {
      log('initiation delay', { remotePeer });
      await sleep(this._initiationDelay);
    }
    if (ctx.disposed) {
      return;
    }

    if (this._isUnregistered(peer)) {
      throw new Error('Peer left during initiation delay');
    }

    if (peer.connection) {
      // Do nothing if peer is already connected.
      return;
    }

    log('initiating connection...', { remotePeer });
    await peer.initiateConnection();
    this._topology.update();
    log('initiated', { remotePeer });
  }

  private async _closeConnection(peerInfo: PeerInfo): Promise<void> {
    const peer = this._peers.get(peerInfo);
    if (!peer) {
      return;
    }

    await peer.closeConnection();
  }

  private _isConnectionEstablishmentInProgress(peer: Peer): boolean {
    if (!peer.connection) {
      return true;
    }
    return [ConnectionState.INITIAL, ConnectionState.CREATED, ConnectionState.CONNECTING].includes(
      peer.connection.state,
    );
  }

  private _isUnregistered(peer?: Peer): boolean {
    return !peer || this._peers.get(peer.remoteInfo) !== peer;
  }
}
