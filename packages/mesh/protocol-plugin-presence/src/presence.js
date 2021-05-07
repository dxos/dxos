//
// Copyright 2021 DXOS.org
//

import bufferJson from 'buffer-json-encoding';
import debug from 'debug';
import { EventEmitter } from 'events';
import createGraph from 'ngraph.graph';
import pLimit from 'p-limit';
import queueMicrotask from 'queue-microtask';

import { Broadcast } from '@dxos/broadcast';
import { Extension } from '@dxos/protocol';

import { schema } from './proto/gen';

const log = debug('presence');

/**
 * Presence.
 */
export class Presence extends EventEmitter {
  static EXTENSION_NAME = 'dxos.protocol.presence';

  /**
   * @constructor
   * @param {Buffer} peerId
   * @param {Object} options
   */
  constructor (peerId, options = {}) {
    super();

    console.assert(Buffer.isBuffer(peerId));

    const { peerTimeout = 2 * 60 * 1000, metadata } = options;

    this._peerId = peerId;
    this._peerTimeout = peerTimeout;
    this._codec = schema
      .getCodecForType('dxos.protocol.presence.Alive');

    this._neighbors = new Map();
    this._metadata = metadata;
    this._limit = pLimit(1);

    this._buildGraph();
    this._buildBroadcast();
    this.on('error', err => {
      log('broadcast-error', err);
    });
  }

  get peerId () {
    return this._peerId;
  }

  get peers () {
    const list = [];
    this._graph.forEachNode((node) => {
      list.push(Buffer.from(node.id, 'hex'));
    });

    return list;
  }

  get graph () {
    return this._graph;
  }

  get metadata () {
    return this._metadata;
  }

  setMetadata (metadata) {
    this._metadata = metadata;
  }

  /**
   * Create protocol extension.
   * @return {Extension}
   */
  createExtension () {
    this.start();

    return new Extension(Presence.EXTENSION_NAME)
      .setInitHandler((protocol) => this._addPeer(protocol))
      .setMessageHandler((protocol, chunk) => this._peerMessageHandler(protocol, chunk))
      .setCloseHandler((protocol) => this._removePeer(protocol));
  }

  ping () {
    return this._limit(() => this._ping());
  }

  start () {
    if (this._scheduler) {
      return;
    }

    this._broadcast.run();

    this._scheduler = setInterval(() => {
      this.ping();
      queueMicrotask(() => this._pruneGraph());
    }, Math.floor(this._peerTimeout / 2));
  }

  stop () {
    this._broadcast.stop();
    clearInterval(this._scheduler);
    this._scheduler = null;
  }

  _buildGraph () {
    this._graph = createGraph();
    this._graph.addNode(this._peerId.toString('hex'), { metadata: this._metadata });
    this._graph.on('changed', (changes) => {
      let graphUpdated = false;

      changes.forEach(({ changeType, node, link }) => {
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

  _buildBroadcast () {
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
      send: async (packet, { protocol }) => {
        const presence = protocol.getExtension(Presence.EXTENSION_NAME);
        await presence.send(packet, { oneway: true });
      },
      subscribe: (onPacket) => {
        this.on('protocol-message', (protocol, message) => {
          if (message && message.data) {
            onPacket(message.data);
          }
        });
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this._peerId
    });

    this._broadcast.on('packet', packet => {
      packet = this._codec.decode(packet.data);
      if (packet.metadata) {
        packet.metadata = bufferJson.decode(packet.metadata);
      }
      this.emit('remote-ping', packet);
    });
    this._broadcast.on('lookup-error', err => console.warn(err));
    this._broadcast.on('send-error', err => console.warn(err));
    this._broadcast.on('subscribe-error', err => console.warn(err));
    this.on('remote-ping', packet => this._updateGraph(packet));
  }

  _peerMessageHandler (protocol, chunk) {
    this.emit('protocol-message', protocol, chunk);
  }

  _pruneGraph () {
    const now = Date.now();
    const localPeerId = this._peerId.toString('hex');
    this._graph.beginUpdate();
    this._graph.forEachNode((node) => {
      if (node.id === localPeerId) {
        return;
      }
      if (this._neighbors.has(node.id)) {
        return;
      }

      if ((now - node.data.lastUpdate) > this._peerTimeout) {
        this._deleteNode(node.id);
      }
    });
    this._graph.endUpdate();
  }

  /**
   * Add peer.
   * @param {Protocol} protocol
   * @private
   */
  _addPeer (protocol) {
    console.assert(protocol);
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
   * @param {Protocol} protocol
   * @private
   */
  _removePeer (protocol) {
    console.assert(protocol);
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
      this._deleteNode(node.id);
    });
  }

  _updateGraph ({ peerId: from, connections = [], metadata }) {
    const fromHex = from.toString('hex');

    const lastUpdate = Date.now();

    this._graph.beginUpdate();

    this._graph.addNode(fromHex, { lastUpdate, metadata });

    connections = connections.map(({ peerId }) => {
      peerId = peerId.toString('hex');
      this._graph.addNode(peerId, { lastUpdate, metadata });
      const [source, target] = [fromHex, peerId].sort();
      return { source, target };
    });

    connections.forEach((conn) => {
      if (!this._graph.hasLink(conn.source, conn.target)) {
        this._graph.addLink(conn.source, conn.target);
      }
    });

    this._graph.forEachLinkedNode(fromHex, (_, link) => {
      const toDelete = !connections.find(conn => conn.source === link.fromId && conn.target === link.toId);

      if (!toDelete) {
        return;
      }

      this._graph.removeLink(link);

      this._deleteNodeIfEmpty(link.fromId);
      this._deleteNodeIfEmpty(link.toId);
    });

    this._graph.endUpdate();
  }

  _deleteNode (id) {
    this._graph.removeNode(id);
    this._graph.forEachLinkedNode(id, (_, link) => {
      this._graph.removeLink(link);
    });
  }

  _deleteNodeIfEmpty (id) {
    const links = this._graph.getLinks(id) || [];
    if (links.length === 0) {
      this._graph.removeNode(id);
    }
  }

  async _ping () {
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
