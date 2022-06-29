//
// Copyright 2021 DXOS.org
//

import { AbortController } from '@azure/abort-controller';
import moment from 'moment';

import { getSystemInfo, getServiceInfo } from '../system-information';

const delay = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, ms);

  const onAbort = () => {
    signal.removeEventListener('abort', onAbort);
    clearTimeout(timer);
    reject(new Error('aborted'));
  };
  signal.addEventListener('abort', onAbort);
});

export const StatusService = {
  name: 'status',
  settings: {
    graphql: {
      type: `
        type Status {
          id: String!
          updatedAt: Timestamp!
          version: String!
          nodes: [Node]!
        }

        type Node {
          id: String!
          kubeStatus: KubeStatus!
          connections: [Connection]!
          signal: Signal
        }

        type Connection {
          id: String!
          target: String!
        }

        type Signal {
          topics: [Topic]!
        }

        type Topic {
          id: String!
          peers: [String]!
        }

        type KubeStatus {
          system: KubeSystemInfo
          services: [KubeService!]
        }

        type KubeSystemInfo {
          version: String
          cpu: CPUInfo,
          memory: MemoryInfo,
          device: DeviceInfo,
          network: NetworkInfo
          os: OSInfo
          time: TimeInfo
          nodejs: NodeJSInfo
        }

        type KubeService {
          name: String!
          status: String!
          cpu: Int!
          memory: Int!
        }

        type CPUInfo {
          brand: String!
          cores: Int!
          manufacturer: String!
          vendor: String!
          speed: String!
        }

        type MemoryInfo {
          total: String!
          free: String!
          used: String!
          swaptotal: String!
        }

        type DeviceInfo {
          model: String!
          serial: String!
          version: String!
        }

        type NetworkInfo {
          hostname: String
          addresses: [String]!
        }

        type OSInfo {
          arch: String!
          platform: String!
          version: String
        }

        type TimeInfo {
          now: Timestamp!
          up: Timestamp!
        }

        type NodeJSInfo {
          version: String!
        }
      `
    }
  },
  actions: {
    status: {
      graphql: {
        query: 'status: Status'
      },
      handler (ctx) {
        const status = this.getStatus();

        return {
          updatedAt: status.updatedAt,
          id: ctx.nodeID,
          nodes: Array.from(status.nodes.values()),
          version: this.broker.metadata.version
        };
      }
    }
  },
  events: {
    '$node.connected' (ctx) {
      this._status.toUpdate = true;
    },
    '$node.disconnected' (ctx) {
      const { node } = ctx.params;
      this._status.nodes.delete(node.id);
      this._status.toUpdate = true;
    },
    '$broker.presence-update' (ctx) {
      this._status.toUpdate = true;
    },
    '$broker.discovery-update' (ctx) {
      this._status.toUpdate = true;
    },
    'status.kube-status' (ctx) {
      this.updateKubeStatus(ctx.nodeID, ctx.params);
    }
  },
  methods: {
    getStatus () {
      const { network } = this.broker.shared;

      const nodes = this.broker.registry.getNodeList({ onlyAvailable: true, withServices: true });

      if (!this._status.toUpdate) {
        return this._status;
      }

      nodes.forEach(node => {
        const oldNode = this._status.nodes.get(node.id) || {};

        this._status.nodes.set(node.id, {
          id: node.id,
          kubeStatus: oldNode.kubeStatus || { services: [] },
          connections: network.getConnections(node.id).map(conn => ({
            id: conn.key,
            target: conn.target
          })),
          signal: {
            topics: this.getSignalPeers(node.id)
          }
        });
      });

      this._status.toUpdate = false;
      this._status.updatedAt = moment();

      return this._status;
    },
    updateKubeStatus (nodeID, { system, services }) {
      if (!this._status.nodes.has(nodeID)) {
        return;
      }

      const node = this._status.nodes.get(nodeID);
      node.kubeStatus = { system, services: services || [] };

      this._status.updatedAt = moment();
    },
    getSignalPeers (peerId) {
      const { peerMap } = this.broker.shared;
      const peerIdBuf = Buffer.from(peerId, 'hex');
      const peersByTopic = new Map();

      peerMap.topics.forEach(topic => {
        const topicStr = topic.toString('hex');
        peerMap.getPeersByTopic(topic)
          .filter(peer => peer.owner.equals(peerIdBuf))
          .map(peerMap.encode)
          .forEach(peer => {
            let value;
            if (peersByTopic.has(topicStr)) {
              value = peersByTopic.get(topicStr);
            } else {
              value = { id: topicStr, peers: [] };
              peersByTopic.set(topicStr, value);
            }

            if (value.peers.includes(peer.id)) {
              return;
            }
            value.peers.push(peer.id);
          });
      });

      return Array.from(peersByTopic.values());
    }
  },
  created () {
    this._status = {
      updatedAt: moment(),
      toUpdate: true,
      nodes: new Map()
    };
  },
  async started () {
    this.getStatus();

    this._controller = new AbortController();
    const signal = this._controller.signal;

    (async () => {
      while (!signal.aborted) {
        // TODO(unknown): This could be an option (pollInterval).
        await delay(10 * 1000, signal);
        const system = await getSystemInfo().catch(() => {});
        const services = await getServiceInfo().catch(() => {});
        if (system || services) {
          this.broker.broadcast('status.kube-status', { system, services });
        }
      }
    })().catch(() => {});
  },
  async stopped () {
    if (this._controller) {
      this._controller.abort();
    }
  }
};
