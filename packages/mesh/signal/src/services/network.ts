//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from 'events';
import Graph from 'graphology';
import debounce from 'lodash.debounce';
import timestamp from 'monotonic-timestamp';
import pLimit from 'p-limit';
import lru, { Lru } from 'tiny-lru';

const MAX_WAIT = 2 * 1000;

export interface Connection {
  key: string,
  target: string
}

export class Network extends EventEmitter {
  private readonly _owner: string;
  private readonly _graph: Graph;
  private readonly _limit: pLimit.Limit;
  private readonly _lastUpdate: Lru;
  readonly publish: ReturnType<typeof debounce>;

  constructor (owner: string, publish: ReturnType<typeof debounce>) {
    super();

    this._owner = owner;
    this._graph = new Graph({ multi: true, type: 'undirected' });
    this._graph.addNode(owner);
    this._limit = pLimit(1);
    this._lastUpdate = lru(1000);

    this.publish = debounce(() => {
      void this._limit(() => {
        this._limit.clearQueue();
        return publish({ timestamp: timestamp(), connections: this.getConnections() });
      });
    }, MAX_WAIT);

    const onChange = debounce(() => this.emit('change', this._graph), MAX_WAIT);
    ['nodeAdded', 'edgeAdded', 'nodeDropped', 'edgeDropped'].forEach(ev => this._graph.on(ev, onChange));
  }

  get graph () {
    return this._graph;
  }

  getConnections (id = this._owner) {
    const connections: Connection[] = [];
    if (!this._graph.hasNode(id)) {
      return [];
    }

    this._graph.forEachEdge(id, (key, attr, source, target) => {
      if (source === id) {
        connections.push({ key, target });
      }
    });

    return connections;
  }

  update (id: string, timestamp: number, connections: Connection[] = []) {
    // ignore old messages
    const lastTimestamp = this._lastUpdate.get(id) || 0;
    if (lastTimestamp > timestamp) {
      return;
    }
    this._lastUpdate.set(id, timestamp);

    if (!this._graph.hasNode(id)) {
      this._graph.addNode(id);
    }

    this._graph.forEachEdge(id, (key, attr, source) => {
      if (source === id) {
        this._graph.dropEdge(key);
      }
    });

    this._graph.import({
      edges: connections.map(conn => ({
        key: conn.key,
        source: id,
        target: conn.target,
        undirected: true
      })),
      nodes: Array.from(new Set(
        connections.reduce((acc, { key, target }) => [...acc, key, target], [] as string[])).values()
      ).map(key => ({ key }))
    });
  }

  addPeer (id: string) {
    if (!this._graph.hasNode(id)) {
      this._graph.addNode(id);
    }
  }

  deletePeer (id: string) {
    if (this._graph.hasNode(id)) {
      this._graph.dropNode(id);
    }
  }

  addConnection (initiator: any, sessionKey: string, peerId: string) {
    if (!this._graph.hasNode(peerId)) {
      this._graph.addNode(peerId);
    }

    if (initiator) {
      this._graph.addEdgeWithKey(sessionKey, this._owner, peerId);
    } else {
      this._graph.addEdgeWithKey(sessionKey, peerId, this._owner);
    }

    this.publish();
  }

  deleteConnection (peer1: string, peer2: string) {
    if (!this._graph.hasEdge(peer1, peer2)) {
      return;
    }
    this._graph.dropEdge(peer1, peer2);
    this.publish();
  }
}
