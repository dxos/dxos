//
// Copyright 2020 DxOS.
//

import assert from 'assert';
import { EventEmitter } from 'events';
import eos from 'end-of-stream';

export class Peer extends EventEmitter {
  constructor (opts = {}) {
    super();

    const { topic, peerId, client = {}, createStream, invitePeer } = opts;

    assert(topic);
    assert(peerId);
    assert(client.feedStore);
    assert(client.modelFactory);
    assert(createStream);
    assert(invitePeer);

    this._topic = topic;
    this._id = peerId;
    this._client = client;
    this._invitePeer = invitePeer;
    this._models = new Set();

    if (createStream) {
      this._createStream = createStream;
    }
  }

  get topic () {
    return this._topic;
  }

  get id () {
    return this._id;
  }

  get client () {
    return this._client;
  }

  get feedStore () {
    return this._client.feedStore;
  }

  get modelFactory () {
    return this._client.modelFactory;
  }

  get createStream () {
    return this._createStream;
  }

  get models () {
    return Array.from(this._models.values());
  }

  addModel (model) {
    this._models.add(model);
  }

  deleteModel (model) {
    this._models.delete(model);
  }

  invitePeer (peer) {
    return this._invitePeer({ fromPeer: this, toPeer: peer });
  }

  destroy () {
    if (this._feedStream.destroyed) return;
    process.nextTick(() => this._feedStream.destroy());
    return new Promise(resolve => eos(this._feedStream, () => resolve));
  }
}
