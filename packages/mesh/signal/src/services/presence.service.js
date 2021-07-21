//
// Copyright 2021 DXOS.org
//

import { Network } from './network';

export const PresenceService = {
  name: 'presence',
  events: {
    '$node.disconnected' (ctx) {
      const { node } = ctx.params;
      this._network.deletePeer(node.id);
    },
    '$node.connected' (ctx) {
      const { node } = ctx.params;
      this._network.addPeer(node.id);
      this._network.publish();
    },
    'presence.update' (ctx) {
      if (ctx.nodeID === this.broker.nodeID) {
        return;
      }

      const { timestamp, connections } = ctx.params;
      return this._network.update(ctx.nodeID, timestamp, connections);
    }
  },
  actions: {
    network () {
      return this._network.graph.export();
    }
  },
  created () {
    const { transporter } = this.broker.options;

    this._network = new Network(this.broker.nodeID, data => {
      return this.broker.broadcast('presence.update', data);
    });

    this.broker.shared.network = this._network;

    this._network.on('change', (graph) => {
      this.broker.broadcastLocal('$broker.presence-update', graph);
    });

    transporter.peers.forEach(peer => {
      try {
        this._network.addConnection(peer.initiator, peer.sessionKey.toString('hex'), peer.id.toString('hex'));
      } catch (err) {
        this.logger.error(err);
      }
    });

    transporter.on('peer-added', ({ initiator, sessionKey, peerId }) => {
      try {
        this._network.addConnection(initiator, sessionKey.toString('hex'), peerId.toString('hex'));
      } catch (err) {
        this.logger.error(err);
      }
    });

    transporter.on('peer-deleted', ({ sessionKey }) => {
      if (!sessionKey) {
        return;
      }

      try {
        this._network.deleteConnection(sessionKey.toString('hex'));
      } catch (err) {
        this.logger.error(err);
      }
    });
  },
  async started () {
    this._network.publish();
  }
};
