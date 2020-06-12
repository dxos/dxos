//
// Copyright 2019 Wireline, Inc.
//

import EventEmitter from 'events';

import { createId, humanize } from '@dxos/crypto';

/**
 * HOC (withModel) ==> ModelFactory => Model <=> App
 *                 \=> Feed <==========/
 *
 * Events: `append`, `update`, `destroy`
 */
export class Model extends EventEmitter {
  constructor (type, options = {}) {
    super();

    const { onAppend = () => {} } = options;

    this._type = type;
    this._onAppend = onAppend;
    this._id = createId();
    this._destroyed = false;
  }

  get type () {
    return this._type;
  }

  get id () {
    return humanize(this._id);
  }

  get destroyed () {
    return this._destroyed;
  }

  async destroy () {
    this._destroyed = true;
    await this.onDestroy();
    this.emit('destroy', this);
  }

  async processMessages (messages) {
    await this.onUpdate(messages);
    this.emit('update', this);
  }

  // TODO(burdon): appendMessages.
  async appendMessage (message) {
    await this._onAppend(message);
    this.emit('append', message);
  }

  //
  // Virtual methods.
  //

  async onUpdate (messages) {
    throw new Error(`Not processed: ${messages.length}`);
  }

  async onDestroy () {}
}

/**
 * Basic log model. Maintains a list of messages in the order read from the stream.
 */
export class DefaultModel extends Model {
  constructor (...args) {
    super(...args);

    this._messages = [];
  }

  get messages () {
    return this._messages;
  }

  async onUpdate (messages) {
    this._messages.push(...messages);
  }
}
