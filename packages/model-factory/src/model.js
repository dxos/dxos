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
  constructor (options = {}) {
    super();

    const { id = createId(), modelFactoryOptions = {} } = options;

    this._id = id;
    this._destroyed = false;
    this._modelFactoryOptions = modelFactoryOptions;
  }

  get id () {
    return humanize(this._id);
  }

  get destroyed () {
    return this._destroyed;
  }

  get modelFactoryOptions () {
    return this._modelFactoryOptions;
  }

  setAppendHandler (cb) {
    if (this._appendHandler) {
      throw new Error('append handler already defined');
    }
    this._appendHandler = cb;
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
    message = await this.onAppend(message);
    if (this._appendHandler) {
      await this._appendHandler(message);
    }
    this.emit('append', message);
  }

  //
  // Virtual methods.
  //

  async onAppend (message) {
    return message;
  }

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
