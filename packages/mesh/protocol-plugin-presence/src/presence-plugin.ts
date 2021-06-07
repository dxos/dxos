//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import bufferJson from 'buffer-json-encoding';
import debug from 'debug';
import { EventEmitter } from 'events';
import { EventedType } from 'ngraph.events';
import createGraph, { Graph } from 'ngraph.graph';
import pLimit from 'p-limit';
import queueMicrotask from 'queue-microtask';

import { Broadcast } from '@dxos/broadcast';
import { Codec } from '@dxos/codec-protobuf';
import { Extension, Protocol } from '@dxos/protocol';

import { schema } from './proto/gen';
import { Alive } from './proto/gen/dxos/protocol/presence';

const log = debug('presence');

export interface PresenceOptions {
  peerTimeout?: number
  metadata?: any
}

interface GraphNode {
  metadata?: any
  lastUpdate?: number
}

/**
 * Presence protocol plugin.
 */
export class PresencePlugin extends EventEmitter {
  static EXTENSION_NAME = 'dxos.protocol.presence';

  private readonly _peerId: Buffer;
  private readonly _peerTimeout: number;
  private readonly _limit: any;

  private _codec: Codec<Alive>;
  private _neighbors!: Map<string, any>;
  private _metadata: any;
  private _graph!: Graph<GraphNode, any> & EventedType;
  private _scheduler: any;
  private _broadcast!: Broadcast;

  public emit: any;

  /**
   * @constructor
   * @param {Buffer} peerId
   * @param {Object} options
   */
  constructor (peerId: Buffer, options: PresenceOptions = {}) {
    super();
    assert(Buffer.isBuffer(peerId));

    const { peerTimeout = 2 * 60 * 1000, metadata } = options;

    this._peerId = peerId;
    this._peerTimeout = peerTimeout;
    this._codec = schema.getCodecForType('dxos.protocol.presence.Alive');

    this._neighbors = new Map();
    this._metadata = metadata;
    this._limit = pLimit(1);

    this._buildGraph();
    this._buildBroadcast();
    this.on('error', (err: Error) => {
      log('broadcast-error', err);
    });
  }

  get peerId () {
    return this._peerId;
  }

  get peers (): Buffer[] {
    const list: Buffer[] = [];
    this._graph.forEachNode((node) => {
      list.push(Buffer.from(node.id as string, 'hex'));
    });

    return list;
  }

  get graph () {
    return this._graph;
  }

  get metadata () {
    return this._metadata;
  }

  setMetadata (metadata: any) {
    this._metadata = metadata;
  }

  /**
   * Create protocol extension.
   * @return {Extension}
   */
  createExtension () {
    this.start();

    return new Extension(PresencePlugin.EXTENSION_NAME)
      .setInitHandler(async (protocol) => this._addPeer(protocol))
      .setMessageHandler(async (protocol, chunk) => this._peerMessageHandler(protocol, chunk))
      .setCloseHandler(async (protocol) => this._removePeer(protocol));
  }

  ping () {
    return this._limit(() => this._ping());
  }

  start () {
    if (this._scheduler) {
      return;
    }

    this._broadcast.open();

    this._scheduler = setInterval(() => {
      this.ping();
      queueMicrotask(() => this._pruneGraph());
    }, Math.floor(this._peerTimeout / 2));
  }

  stop () {
    this._broadcast.close();
    clearInterval(this._scheduler);
    this._scheduler = null;
  }

  private _buildGraph () {
    this._graph = createGraph();
    this._graph.addNode(this._peerId.toString('hex'), { metadata: this._metadata });
    this._graph.on('changed', (changes) => {
      let graphUpdated = false;

      changes.forEach(({ changeType, node, link }: any) => {
        if (changeType === 'update') {
          return;
        }

        graphUpdated = true;

        const type = changeType === 'add' ? 'joined' : 'left';

        if (node) {
          this.emit(`peer:${type}`, Buffer.from(node.id, 'hex'));
        }
        if (link) {
          this.emit(`connection:${type}`, Buffer.from(link.fromId, 'hex'), Buffer.from(link.toId, 'hex'));
        }
      });

      if (graphUpdated) {
        log('graph-updated', changes);
        this.emit('graph-updated', changes, this._graph);
      }
    });
  }

  private _buildBroadcast () {
    const middleware = {
      lookup: () => {
        return Array.from(this._neighbors.values()).map((peer) => {
          const { peerId } = peer.getSession();

          return {
            id: peerId,
            protocol: peer
          };
        });
      },
      send: async (packet: any, { protocol }: { protocol: Protocol}) => {
        const presence = protocol.getExtension(PresencePlugin.EXTENSION_NAME);
        assert(presence);
        await presence.send(packet, { oneway: true });
      },
      subscribe: (onPacket: (msg: any) => void) => {
        this.on('protocol-message', (protocol: Protocol, message: any) => {
          if (message && message.data) {
            onPacket(message.data);
          }
        });
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this._peerId
    });

    this._broadcast.on('packet', (packet: any) => {
      packet = this._codec.decode(packet.data);
      if (packet.metadata) {
        packet.metadata = bufferJson.decode(packet.metadata);
      }
      this.emit('remote-ping', packet);
    });
    this._broadcast.on('lookup-error', (err: Error) => console.warn(err));
    this._broadcast.on('send-error', (err: Error) => console.warn(err));
    this._broadcast.on('subscribe-error', (err: Error) => console.warn(err));
    this.on('remote-ping', packet => this._updateGraph(packet));
  }

  private _peerMessageHandler (protocol: Protocol, chunk: any) {
    this.emit('protocol-message', protocol, chunk);
  }

  private _pruneGraph () {
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

      if ((now - node.data.lastUpdate!) > this._peerTimeout) {
        this._deleteNode(node.id as string);
      }
    });
    this._graph.endUpdate();
  }

  private _addPeer (protocol: Protocol) {
    assert(protocol);
    const session = protocol.getSession();

    if (!session || !session.peerId) {
      this.emit('error', new Error('peerId not found'));
      return;
    }

    const { peerId } = session;
    const peerIdHex = peerId.toString('hex');

    if (this._neighbors.has(peerIdHex)) {
      this.emit('neighbor:already-connected', peerId);
      return;
    }

    this._neighbors.set(peerIdHex, protocol);

    this.emit('neighbor:joined', peerId, protocol);
    this.ping();
  }

  /**
   * Remove peer.
   */
  private _removePeer (protocol: Protocol) {
    assert(protocol);
    const session = protocol.getSession();
    if (!session || !session.peerId) {
      return;
    }

    const { peerId } = session;
    const peerIdHex = peerId.toString('hex');

    this._neighbors.delete(peerIdHex);
    this._deleteNode(peerIdHex);
    this.emit('neighbor:left', peerId);

    if (this._neighbors.size > 0) {
      return this.ping();
    }

    // We clear the._graph graph.
    const localPeerId = this._peerId.toString('hex');
    this._graph.forEachNode((node) => {
      if (node.id === localPeerId) {
        return;
      }
      this._deleteNode(node.id as string);
    });
  }

  private _updateGraph ({ peerId: from, connections = [], metadata }: any) {
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

    this._graph.forEachLinkedNode(fromHex, (_, link) => {
      const toDelete = !connections.find((conn: any) => conn.source === link.fromId && conn.target === link.toId);

      if (!toDelete) {
        return;
      }

      this._graph.removeLink(link);

      this._deleteNodeIfEmpty(link.fromId as string);
      this._deleteNodeIfEmpty(link.toId as string);
    }, false);

    this._graph.endUpdate();
  }

  private _deleteNode (id: string) {
    this._graph.removeNode(id);
    this._graph.forEachLinkedNode(id, (_, link) => {
      this._graph.removeLink(link);
    }, false);
  }

  private _deleteNodeIfEmpty (id: string) {
    const links = this._graph.getLinks(id) || [];
    if (links.length === 0) {
      this._graph.removeNode(id);
    }
  }

  private async _ping () {
    this._limit.clearQueue();

    try {
      const message = {
        peerId: this._peerId,
        connections: Array.from(this._neighbors.values()).map((peer) => {
          const { peerId } = peer.getSession();
          return { peerId };
        }),
        metadata: this._metadata && bufferJson.encode(this._metadata)
      };
      await this._broadcast.publish(this._codec.encode(message));
      log('ping', message);
    } catch (err) {
      process.nextTick(() => this.emit('error', err));
    }
  }
}
