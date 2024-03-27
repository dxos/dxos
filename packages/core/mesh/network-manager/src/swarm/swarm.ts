//
// Copyright 2020 DXOS.org
//

import { Event, scheduleTask, sleep, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { type ListeningHandle, type Messenger } from '@dxos/messaging';
import { trace } from '@dxos/protocols';
import { type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { type Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap, isNotNullOrUndefined } from '@dxos/util';

import { type Connection, ConnectionState } from './connection';
import { type ConnectionLimiter } from './connection-limiter';
import { Peer } from './peer';
import { SwarmMessenger, type OfferMessage, type SignalMessage } from '../signal';
import { type SwarmController, type Topology } from '../topology';
import { type TransportFactory } from '../transport';
import { type Topic } from '../types';
import { type WireProtocolProvider } from '../wire-protocol';

const INITIATION_DELAY = 100;

// TODO(burdon): Factor out.
const getClassName = (obj: any) => Object.getPrototypeOf(obj).constructor.name;

/**
 * A single peer's view of the swarm.
 * Manages a set of connections implemented by simple-peer instances.
 * Routes signal events and maintains swarm topology.
 */
export class Swarm {
  private readonly _swarmMessenger: SwarmMessenger;

  private _ctx = new Context();

  private _listeningHandle?: ListeningHandle = undefined;

  /**
   * @internal
   */
  readonly _peers = new ComplexMap<PublicKey, Peer>(PublicKey.hash);

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
  readonly disconnected = new Event<PublicKey>();

  /**
   * Connection is established to a new peer.
   * @internal
   */
  readonly connected = new Event<PublicKey>();

  readonly errors = new ErrorStream();

  // TODO(burdon): Swarm => Peer.create/destroy =< Connection.open/close

  // TODO(burdon): Split up properties.
  constructor(
    private readonly _topic: PublicKey,
    // usually the deviceKey
    private readonly _ownPeerId: PublicKey,
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
      trace.begin({ id: this._instanceId, data: { topic: this._topic.toHex(), peerId: this._ownPeerId.toHex() } }),
    );
    log('creating swarm', { peerId: _ownPeerId });
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
      .filter(isNotNullOrUndefined);
  }

  @logInfo
  get ownPeerId() {
    return this._ownPeerId;
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

  async open() {
    invariant(!this._listeningHandle);
    this._listeningHandle = await this._messenger.listen({
      peerId: this._ownPeerId,
      payloadType: 'dxos.mesh.swarm.SwarmMessage',
      onMessage: async (message) => {
        await this._swarmMessenger
          .receiveMessage(message)
          // TODO(nf): discriminate between errors
          .catch((err) => log.info('Error while receiving message', { err }));
      },
    });
  }

  async destroy() {
    log('destroying...');
    await this._listeningHandle?.unsubscribe();
    this._listeningHandle = undefined;

    await this._ctx.dispose();
    await this._topology.destroy();
    await Promise.all(Array.from(this._peers.keys()).map((key) => this._destroyPeer(key, 'swarm destroyed')));
    log('destroyed');
  }

  async setTopology(topology: Topology) {
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
  onSwarmEvent(swarmEvent: SwarmEvent) {
    log('swarm event', { swarmEvent }); // TODO(burdon): Stringify.

    if (this._ctx.disposed) {
      log('swarm event ignored for disposed swarm');
      return;
    }

    if (swarmEvent.peerAvailable) {
      const peerId = PublicKey.from(swarmEvent.peerAvailable.peer);
      log('new peer', { peerId });
      if (!peerId.equals(this._ownPeerId)) {
        const peer = this._getOrCreatePeer(peerId);
        peer.advertizing = true;
      }
    } else if (swarmEvent.peerLeft) {
      const peer = this._peers.get(PublicKey.from(swarmEvent.peerLeft.peer));
      if (peer) {
        peer.advertizing = false;
        if (peer.connection?.state !== ConnectionState.CONNECTED) {
          // Destroy peer only if there is no p2p-connection established
          void this._destroyPeer(peer.id, 'peer left').catch((err) => log.catch(err));
        }
      } else {
        log('received peerLeft but no peer found', { peer: swarmEvent.peerLeft.peer });
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
    if (!message.recipient?.equals(this._ownPeerId)) {
      log('rejecting offer with incorrect peerId', { message });
      return { accept: false };
    }
    if (!message.topic?.equals(this._topic)) {
      log('rejecting offer with incorrect topic', { message });
      return { accept: false };
    }

    const peer = this._getOrCreatePeer(message.author);
    const answer = await peer.onOffer(message);
    this._topology.update();
    return answer;
  }

  async onSignal(message: SignalMessage): Promise<void> {
    log('signal', { message });
    if (this._ctx.disposed) {
      log.info('ignored for offline swarm');
      return;
    }
    invariant(
      message.recipient?.equals(this._ownPeerId),
      `Invalid signal peer id expected=${this.ownPeerId}, actual=${message.recipient}`,
    );
    invariant(message.topic?.equals(this._topic));
    invariant(message.author);

    const peer = this._getOrCreatePeer(message.author);
    await peer.onSignal(message);
  }

  // For debug purposes
  @synchronized
  async goOffline() {
    await this._ctx.dispose();
    await Promise.all([...this._peers.keys()].map((peerId) => this._destroyPeer(peerId, 'goOffline')));
  }

  // For debug purposes
  @synchronized
  async goOnline() {
    this._ctx = new Context();
  }

  private _getOrCreatePeer(peerId: PublicKey): Peer {
    let peer = this._peers.get(peerId);
    if (!peer) {
      peer = new Peer(
        peerId,
        this._topic,
        this._ownPeerId,
        this._swarmMessenger,
        this._protocolProvider,
        this._transportFactory,
        this._connectionLimiter,
        {
          onInitiated: (connection) => {
            this.connectionAdded.emit(connection);
          },
          onConnected: () => {
            this.connected.emit(peerId);
          },
          onDisconnected: async () => {
            if (!peer!.advertizing) {
              await this._destroyPeer(peer!.id, 'peer disconnected');
            }

            this.disconnected.emit(peerId);
            this._topology.update();
          },
          onRejected: () => {
            // If the peer rejected our connection remove it from the set of candidates.
            // TODO(dmaretskyi): Set flag instead.
            if (this._peers.has(peerId)) {
              log('peer rejected connection', { peerId });
              void this._destroyPeer(peerId, 'peer rejected connection');
            }
          },
          onAccepted: () => {
            this._topology.update();
          },
          onOffer: (remoteId) => {
            return this._topology.onOffer(remoteId);
          },
          onPeerAvailable: () => {
            this._topology.update();
          },
        },
      );
      this._peers.set(peerId, peer);
    }

    return peer;
  }

  private async _destroyPeer(peerId: PublicKey, reason?: string) {
    invariant(this._peers.has(peerId));
    await this._peers.get(peerId)!.destroy(new Error(reason));
    this._peers.delete(peerId);
  }

  private _getSwarmController(): SwarmController {
    return {
      getState: () => ({
        ownPeerId: this._ownPeerId,
        connected: Array.from(this._peers.values())
          .filter((peer) => peer.connection)
          .map((peer) => peer.id),
        candidates: Array.from(this._peers.values())
          .filter((peer) => !peer.connection && peer.advertizing && peer.availableToConnect)
          .map((peer) => peer.id),
      }),
      connect: (peer) => {
        if (this._ctx.disposed) {
          return;
        }

        // Run in a separate non-blocking task.
        scheduleTask(this._ctx, async () => {
          try {
            await this._initiateConnection(peer);
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
          await this._closeConnection(peer);
          this._topology.update();
        });
      },
    };
  }

  /**
   * Creates a connection then sends message over signal network.
   */
  private async _initiateConnection(remoteId: PublicKey) {
    const ctx = this._ctx; // Copy to avoid getting reset while sleeping.

    // It is likely that the other peer will also try to connect to us at the same time.
    // If our peerId is higher, we will wait for a bit so that other peer has a chance to connect first.
    if (remoteId.toHex() < this._ownPeerId.toHex()) {
      log('initiation delay', { remoteId });
      await sleep(this._initiationDelay);
    }
    if (ctx.disposed) {
      return;
    }

    const peer = this._getOrCreatePeer(remoteId);

    if (peer.connection) {
      // Do nothing if peer is already connected.
      return;
    }

    log('initiating connection...', { remoteId });
    await peer.initiateConnection();
    this._topology.update();
    log('initiated', { remoteId });
  }

  private async _closeConnection(peerId: PublicKey) {
    const peer = this._peers.get(peerId);
    if (!peer) {
      return;
    }

    await peer.closeConnection();
  }
}
