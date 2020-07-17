//
// Copyright 2020 DxOS.
//

import assert from 'assert';
import pEvent from 'p-event';
import { EventEmitter } from 'events';

import { randomBytes } from '@dxos/crypto';

const kAgent = Symbol('agent');
const kPeer = Symbol('peer');
const kState = Symbol('state');

export class Agent extends EventEmitter {
  constructor (topic, definition = {}) {
    super();

    const { id = randomBytes(6).toString('hex'), spec = {} } = definition;
    assert(spec.ModelClass, 'spec.ModelClass is required');

    this._topic = topic;
    this._id = id;
    this._spec = Object.assign({}, { options: {} }, spec);

    this._models = new Set();
  }

  get state () {
    let appended = 0;
    let processed = 0;

    this.models.forEach(model => {
      appended += model[kState].appended;
      processed += model[kState].processed;
    });

    return { appended, processed };
  }

  get models () {
    return Array.from(this._models.values());
  }

  get sync () {
    const state = this.state;
    return state.processed === (state.appended * this._models.size);
  }

  createModel (peer) {
    const model = peer.modelFactory.createModel(this._spec.ModelClass, { ...this._spec.options, topic: this._topic.toString('hex') });
    model[kAgent] = this;
    model[kPeer] = peer;
    model[kState] = {
      appended: 0,
      processed: 0
    };

    model.on('preappend', () => {
      model[kState].appended++;
      this.emit('preappend');
    });

    model.on('update', (_, messages) => {
      model[kState].processed += messages.length;
      this.emit('update', { topic: this._topic, peerId: peer.id, model, messages });
    });

    peer.addModel(model);
    this._models.add(model);

    if (this._spec.generator) {
      const unsubscribe = this._spec.generator(model, peer);
      model.once('destroy', () => {
        if (unsubscribe) {
          unsubscribe();
        }

        peer.deleteModel(model);
        this._models.delete(model);
      });
    }

    return model;
  }

  async waitForSync (timeout = 50 * 1000) {
    if (this.sync) {
      return;
    }

    return pEvent(this, 'update', {
      timeout,
      filter: () => this.sync
    });
  }

  async waitForModelSync (model, timeout = 50 * 1000) {
    const modelState = model[kState];

    if (modelState.processed === this.state.appended) {
      return;
    }

    return pEvent(model, 'update', {
      timeout,
      filter: () => modelState.processed === this.state.appended
    });
  }

  getRandomModel () {
    const models = this.models;
    return models[Math.floor(Math.random() * (models.length - 0)) + 0];
  }
}

export const getAgent = (model) => model[kAgent];
export const getState = (model) => model[kState];
