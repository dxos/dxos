//
// Copyright 2020 DxOS.
//

const Server = require('simple-websocket/server');
const { SocketSignalServer, errors: { ERR_PEER_NOT_FOUND } } = require('socket-signal');

class SignalServer extends SocketSignalServer {
  constructor (server, broker, opts = {}) {
    const { path, ...signalOpts } = opts;

    super(signalOpts);

    const { keyPair, peerMap } = broker.shared;

    this._broker = broker;
    this._keyPair = keyPair;
    this._peerMap = peerMap;

    this._server = new Server({ server, path });
    this._server.setMaxListeners(Infinity);

    this.on('error', err => this._broker.logger.warn('signal-server', err));
    this.on('rpc-error', err => this._broker.logger.warn('rpc-signal-server', err));
  }

  _onSocket (socket) {
    this.addSocket(socket).catch(err => process.nextTick(() => this.emit('error', err)));
  }

  async _open () {
    this._server.on('connection', this._onSocket.bind(this));
  }

  async _close () {
    this._server.removeListener('connection', this._onSocket.bind(this));
    await super._close();
    return new Promise(resolve => this._server.close(() => resolve()));
  }

  async _onDisconnect (rpc) {
    const peer = this._peerMap.peers.find(p => p.rpc === rpc);
    if (peer) {
      this._peerMap.peers
        .filter(p => p.rpc === rpc)
        .forEach(p => this._peerMap.delete(p.topic, p.id));

      this._broker.logger.info('peer-disconnected', { id: peer.id.toString('hex') });
    }
  }

  async _onJoin (rpc, data) {
    this._peerMap.add({
      id: data.id,
      topic: data.topic,
      owner: this._keyPair.publicKey,
      rpc
    });
    this._broker.logger.info('peer-join', { topic: data.topic.toString('hex'), id: data.id.toString('hex') });
    return this._peerMap.getPeersByTopic(data.topic).map(p => p.id);
  }

  async _onLeave (rpc, data) {
    this._broker.logger.info('peer-leave', { topic: data.topic.toString('hex'), id: data.id.toString('hex') });
    this._peerMap.delete(data.topic, data.id);
  }

  async _onOffer (rpc, data) {
    const remotePeer = this._peerMap.peers.find(p => p.topic.equals(data.topic) && p.id.equals(data.remoteId));
    if (!remotePeer) throw new ERR_PEER_NOT_FOUND(data.remoteId.toString('hex'));

    if (remotePeer.owner.equals(this._keyPair.publicKey)) {
      const rpc = remotePeer.rpc;
      if (!rpc) throw new Error('rpc not found');
      return rpc.call('offer', data);
    }

    return this._broker.call('discovery.offer', data, { nodeID: remotePeer.owner.toString('hex'), retries: 0 });
  }

  async _onSignal (rpc, data) {
    const remotePeer = this._peerMap.peers.find(p => p.topic.equals(data.topic) && p.id.equals(data.remoteId));
    if (!remotePeer) throw new ERR_PEER_NOT_FOUND(data.remoteId.toString('hex'));

    if (remotePeer.owner.equals(this._keyPair.publicKey)) {
      const rpc = remotePeer.rpc;
      if (!rpc) throw new Error('rpc not found');
      return rpc.emit('signal', data);
    }

    return this._broker.call('discovery.signal', data, { nodeID: remotePeer.owner.toString('hex'), retries: 0 });
  }

  async _onLookup (rpc, data) {
    return this._peerMap.getPeersByTopic(data.topic).map(p => p.id);
  }
}

exports.SignalServer = SignalServer;
