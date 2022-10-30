//
// Copyright 2021 DXOS.org
//

import bufferJson from 'buffer-json-encoding';
import debug from 'debug';
import { EventedType } from 'ngraph.events';
import createGraph, { Graph } from 'ngraph.graph';
import assert from 'node:assert';
import pLimit from 'p-limit';
import queueMicrotask from 'queue-microtask';

import { Event } from '@dxos/async';
import { Broadcast, Middleware } from '@dxos/broadcast';
import { PublicKey } from '@dxos/keys';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { schema } from '@dxos/protocols';
import { Alive } from '@dxos/protocols/proto/dxos/mesh/presence';

const log = debug('dxos:mesh:presence');

export type PresenceOptions = {
  peerTimeout?: number;
  metadata?: any;
};

type GraphNode = {
  metadata?: any;
  lastUpdate?: number;
};

type Peer = {
  id: Buffer;
  protocol: Protocol;
};

type ConnectionEventDetails = {
  fromId: Buffer;
  toId: Buffer;
};

type ProtocolMessageEventDetails = {
  protocol: Protocol;
  message: any;
};

type NeighborJoinedEventDetails = {
  peerId: string;
  protocol: Protocol;
};

type GraphUpdatedEventDetails = {
  graph: any;
  changes: any;
};

/**
 * Presence protocol plugin.
 */
export class PresencePlugin {
  static readonly EXTENSION = 'dxos.mesh.protocol.presence';

  private readonly _peerTimeout: number;
  private readonly _limit = pLimit(1);
  private readonly _codec = schema.getCodecForType('dxos.mesh.presence.Alive');
  private readonly _neighbors = new Map<string, any>();

  // TODO(dmaretskyi): Delete events that aren't used.
  private readonly _error = new Event<Error>();
  private readonly _peerJoined = new Event<Buffer>();
  private readonly _peerLeft = new Event<Buffer>();
  private readonly _connectionJoined = new Event<ConnectionEventDetails>();
  private readonly _connectionLeft = new Event<ConnectionEventDetails>();
  private readonly _protocolMessage = new Event<ProtocolMessageEventDetails>();
  private readonly _remotePing = new Event<Alive>();
  private readonly _neighborAlreadyConnected = new Event<string>();
  private readonly _neighborJoined = new Event<NeighborJoinedEventDetails>();
  private readonly _neighborLeft = new Event<string>();

  readonly graphUpdated = new Event<GraphUpdatedEventDetails>();

  private _metadata: any;
  private _graph!: Graph<GraphNode, any> & EventedType;
  private _broadcast!: Broadcast<Peer>;
  private _scheduler: NodeJS.Timeout | null = null;

  private _extensionsCreated = 0; // TODO(burdon): Debug only?

  // prettier-ignore
  constructor(
    private readonly _peerId: Buffer, options: PresenceOptions = {}
  ) {
    assert(Buffer.isBuffer(_peerId));

    const { peerTimeout = 2 * 60 * 1000, metadata } = options;
    this._peerTimeout = peerTimeout;

    this._metadata = metadata;

    this._buildGraph();
    this._buildBroadcast();
    this._error.on((err: Error) => {
      log('broadcast-error', err);
    });
  }

  get peerId() {
    return this._peerId;
  }

  get peers(): Buffer[] {
    const list: Buffer[] = [];
    this._graph.forEachNode((node) => {
      list.push(Buffer.from(node.id as string, 'hex'));
    });

    return list;
  }

  get graph() {
    return this._graph;
  }

  get metadata() {
    return this._metadata;
  }

  setMetadata(metadata: any) {
    this._metadata = metadata;
  }

  /**
   * Create protocol extension.
   */
  createExtension(): Extension {
    this.start();
    this._extensionsCreated++;

    return new Extension(PresencePlugin.EXTENSION)
      .setInitHandler(async (protocol) => this._addPeer(protocol))
      .setMessageHandler(async (protocol, chunk) => this._peerMessageHandler(protocol, chunk))
      .setCloseHandler(async (protocol) => {
        await this._removePeer(protocol);
        if (--this._extensionsCreated === 0) {
          // The last extension got closed so the plugin can be stopped.
          await this.stop();
        }
      });
  }

  /**
   * NOTICE: Does not return a Promise cause it could hang if the queue is cleared.
   */
  private _pingLimit() {
    void this._limit(() => this.ping());
  }

  start() {
    if (this._scheduler) {
      return;
    }

    log('Start');

    this._broadcast.open();

    void this.ping();

    this._scheduler = setInterval(() => {
      this._pingLimit();
      queueMicrotask(() => this._pruneGraph());
    }, Math.floor(this._peerTimeout / 2));
  }

  stop() {
    log('Stop');

    this._limit.clearQueue();
    this._broadcast.close();
    if (this._scheduler !== null) {
      clearInterval(this._scheduler);
      this._scheduler = null;
    }
  }

  private _buildGraph() {
    this._graph = createGraph();
    this._graph.addNode(this._peerId.toString('hex'), {
      metadata: this._metadata
    });
    this._graph.on('changed', (changes) => {
      let graphUpdated = false;

      changes.forEach(({ changeType, node, link }: any) => {
        if (changeType === 'update') {
          return;
        }

        graphUpdated = true;

        if (node) {
          if (changeType === 'add') {
            this._peerJoined.emit(Buffer.from(node.id, 'hex'));
          } else {
            this._peerLeft.emit(Buffer.from(node.id, 'hex'));
          }
        }
        if (link) {
          if (changeType === 'add') {
            this._connectionJoined.emit({
              fromId: Buffer.from(link.fromId, 'hex'),
              toId: Buffer.from(link.toId, 'hex')
            });
          } else {
            this._connectionLeft.emit({
              fromId: Buffer.from(link.fromId, 'hex'),
              toId: Buffer.from(link.toId, 'hex')
            });
          }
        }
      });

      if (graphUpdated) {
        log('graph-updated', changes);
        this.graphUpdated.emit({
          graph: this._graph,
          changes
        });
      }
    });
  }

  private _buildBroadcast() {
    const middleware: Middleware<Peer> = {
      lookup: async () => {
        return Array.from(this._neighbors.values()).map((peer) => {
          const { peerId } = peer.getSession();

          return {
            id: PublicKey.bufferize(peerId),
            protocol: peer
          };
        });
      },
      send: async (packet, { protocol }) => {
        const presence = protocol.getExtension(PresencePlugin.EXTENSION);
        assert(presence);
        await presence.send(packet, { oneway: true });
      },
      subscribe: (onPacket) => {
        this._protocolMessage.on(({ protocol, message }) => {
          if (message && message.data) {
            onPacket(message.data);
          }
        });
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this._peerId
    });

    this._broadcast.packet.on((packet) => {
      assert(packet.data);
      const data = this._codec.decode(packet.data);
      if (data.metadata) {
        data.metadata = bufferJson.decode(data.metadata);
      }
      this._remotePing.emit(data);
    });
    this._broadcast.sendError.on((err) => {
      // Filter out "stream closed" errors.
      // TODO(dmaretskyi): Define error classes for these and use instanceof.
      if (
        !['ERR_PROTOCOL_STREAM_CLOSED', 'NMSG_ERR_CLOSE'].includes((err as any).code) &&
        err.message !== 'Resource is closed'
      ) {
        console.warn(err);
      }
    });
    this._broadcast.subscribeError.on((err) => console.warn(err));
    this._remotePing.on((packet) => this._updateGraph(packet));
  }

  private _peerMessageHandler(protocol: Protocol, chunk: any) {
    this._protocolMessage.emit({
      protocol,
      message: chunk
    });
  }

  private _pruneGraph() {
    const now = Date.now();
    const localPeerId = this._peerId.toString('hex');
    this._graph.beginUpdate();
    this._graph.forEachNode((node) => {
      if (node.id === localPeerId) {
        return;
      }
      if (this._neighbors.has(node.id as string)) {
        return;
      }

      if (now - node.data.lastUpdate! > this._peerTimeout) {
        this._deleteNode(node.id as string);
      }
    });
    this._graph.endUpdate();
  }

  private _addPeer(protocol: Protocol) {
    assert(protocol);
    const { peerId } = protocol.getSession() ?? {};
    assert(typeof peerId === 'string');

    log(`_addPeer ${peerId}`);

    if (!peerId) {
      this._error.emit(new Error('peer_id not found'));
      return;
    }

    if (this._neighbors.has(peerId)) {
      this._neighborAlreadyConnected.emit(peerId);
      return;
    }

    this._neighbors.set(peerId, protocol);

    this._neighborJoined.emit({ peerId, protocol });
    this._pingLimit();
  }

  /**
   * Remove peer.
   */
  private async _removePeer(protocol: Protocol) {
    assert(protocol);
    const { peerId } = protocol.getSession() ?? {};

    log(`_removePeer ${peerId}`);

    if (!peerId) {
      return;
    }

    this._neighbors.delete(peerId);
    this._deleteNode(peerId);
    this._neighborLeft.emit(peerId);

    if (this._neighbors.size > 0) {
      await this.ping();
    }

    // We clear `this._graph` graph.
    const localPeerId = this._peerId.toString('hex');
    this._graph.forEachNode((node) => {
      if (node.id === localPeerId) {
        return;
      }
      this._deleteNode(node.id as string);
    });
  }

  private _updateGraph({ peerId: from, connections = [], metadata }: any) {
    const fromHex = from.toString('hex');

    const lastUpdate = Date.now();

    this._graph.beginUpdate();

    this._graph.addNode(fromHex, { lastUpdate, metadata });

    connections = connections.map(({ peerId }: any) => {
      peerId = peerId.toString('hex');
      this._graph.addNode(peerId, { lastUpdate, metadata });
      const [source, target] = [fromHex, peerId].sort();
      return { source, target };
    });

    connections.forEach((conn: any) => {
      if (!this._graph.hasLink(conn.source, conn.target)) {
        this._graph.addLink(conn.source, conn.target);
      }
    });

    this._graph.forEachLinkedNode(
      fromHex,
      (_, link) => {
        const toDelete = !connections.find((conn: any) => conn.source === link.fromId && conn.target === link.toId);

        if (!toDelete) {
          return;
        }

        this._graph.removeLink(link);

        this._deleteNodeIfEmpty(link.fromId as string);
        this._deleteNodeIfEmpty(link.toId as string);
      },
      false
    );

    this._graph.endUpdate();
  }

  private _deleteNode(id: string) {
    this._graph.removeNode(id);
    this._graph.forEachLinkedNode(
      id,
      (_, link) => {
        this._graph.removeLink(link);
      },
      false
    );
  }

  private _deleteNodeIfEmpty(id: string) {
    const links = this._graph.getLinks(id) || [];
    if (links.length === 0) {
      this._graph.removeNode(id);
    }
  }

  async ping(): Promise<void> {
    this._limit.clearQueue();

    try {
      const message: Alive = {
        peerId: this._peerId,
        connections: Array.from(this._neighbors.values()).map((peer) => ({
          peerId: PublicKey.bufferize(peer.getSession().peerId)
        })),
        metadata: this._metadata && bufferJson.encode(this._metadata)
      };
      await this._broadcast.publish(Buffer.from(this._codec.encode(message)));
      log('ping', message);
    } catch (err: any) {
      // TODO(dmaretskyi): This or one of its subscribers seems to leak "Error: Resource is closed" errors.
      // They are not fatal, and probably happend because the connection was closed but the broadcast job was not cleaned up.
      process.nextTick(() => this._error.emit(err));
    }
  }
}
