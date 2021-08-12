//
// Copyright 2021 DXOS.org
//

import debounce from 'lodash.debounce';
import pLimit from 'p-limit';

export const DiscoveryService = {
  name: 'discovery',
  events: {
    '$node.disconnected' (ctx) {
      const { peerMap } = this.broker.shared;

      peerMap.deletePeersByOwner(Buffer.from(ctx.params.node.id, 'hex'));
    },
    '$node.connected' () {
      const { peerMap } = this.broker.shared;
      const owner = Buffer.from(this.broker.nodeID, 'hex');
      const peers = peerMap
        .peers
        .filter(p => p.owner.equals(owner))
        .map(peerMap.encode);

      if (peers.length === 0) {
        return;
      }
      return this.broker.broadcast('discovery.update', { peers }).catch(() => {});
    },
    'discovery.update' (ctx) {
      const { peerMap } = this.broker.shared;
      const { peers } = ctx.params;

      if (ctx.nodeID === this.broker.nodeID) {
        this._discoveryUpdate();
        return;
      }

      peerMap.updatePeersByOwner(Buffer.from(ctx.nodeID, 'hex'), peers.map(peerMap.decode));
      this._discoveryUpdate();
    }
  },
  actions: {
    offer (ctx) {
      this.logger.debug('offer', ctx.params);

      const { peerMap } = this.broker.shared;
      const { remoteId } = ctx.params;

      const peer = peerMap.peers.find(p => p.id.equals(remoteId) && p.rpc);
      if (!peer) {
        throw new Error('rpc not found');
      }

      return peer.rpc.call('offer', ctx.params);
    },
    signal (ctx) {
      this.logger.debug('signal', ctx.params);

      const { peerMap } = this.broker.shared;
      const { remoteId } = ctx.params;

      const peer = peerMap.peers.find(p => p.id.equals(remoteId) && p.rpc);
      if (!peer) {
        throw new Error('rpc not found');
      }

      return peer.rpc.emit('signal', ctx.params);
    }
  },
  created () {
    const { peerMap } = this.broker.shared;
    const owner = Buffer.from(this.broker.nodeID, 'hex');

    this._limit = pLimit(1);

    this._updatePeers = debounce(() => {
      this._limit(() => {
        this._limit.clearQueue();
        const peers = peerMap
          .peers
          .filter(p => p.owner.equals(owner))
          .map(peerMap.encode);
        return this.broker.broadcast('discovery.update', { peers }).catch(() => {});
      }).catch(() => {});
    }, 1000);

    this._discoveryUpdate = debounce(() => {
      this.broker.broadcastLocal('$broker.discovery-update');
    }, 1000);
  },
  async started () {
    const { peerMap } = this.broker.shared;

    peerMap.on('peer-added', this._updatePeers);
    peerMap.on('peer-deleted', this._updatePeers);
  },
  async stopped () {
    const { peerMap } = this.broker.shared;

    peerMap.off('peer-added', this._updatePeers);
    peerMap.off('peer-deleted', this._updatePeers);
  }
};
