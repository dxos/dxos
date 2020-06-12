//
// Copyright 2019 Wireline, Inc.
//

import assert from 'assert';
import { Writable } from 'stream';
import pump from 'pump';

// import metrics from '@dxos/metrics';

import { Subscriber } from './subscriber';
import { DefaultModel } from './model';
import { bufferedStreamHandler } from './buffer-stream';

/**
 * Model factory creates instances of Model classes and creates a bound Readable stream configured
 * by the model options, and a Writable stream.
 */
export class ModelFactory {
  /**
   * @param {FeedStore} feedStore
   * @param {Object} options
   * @param {function} options.onAppend
   * @param {function} options.onMessages
   */
  constructor (feedStore, options = {}) {
    assert(feedStore);

    const { onAppend = () => {}, onMessage } = options;

    this._subscriber = new Subscriber(feedStore);
    this._onAppend = onAppend;
    this._onMessage = onMessage;
  }

  /**
   * Creates an instance of the model.
   *
   * @param ModelClass
   * @param options {Object}
   * @param options.topic {String}
   * @param options.readStreamOptions {Object}
   * @param options.batchPeriod {number}
   * @returns {Promise<Model>}
   */
  async createModel (ModelClass = DefaultModel, options = {}) {
    assert(ModelClass);

    const { type, topic, subscriptionOptions = {}, batchPeriod = 50, ...rest } = options;

    const feedInfo = subscriptionOptions.feedLevelIndexInfo;

    // TODO(burdon): Option to cache and reference count models.
    const model = new ModelClass(type, {
      // Why I have to pass the ...rest as it was some kind of extra fields?
      // What happen if someone put a function there, are we going to store [function Function]?
      onAppend: message => this._onAppend({ ...message, ...rest }, options)
    });

    // metrics.set(`model.${model.id}.options`, { class: ModelClass.name, ...(type && { type }) });
    // const createTimer = metrics.start(`model.${model.id}.createTimer`);

    //
    // Incoming messages (create read stream).
    //

    // TODO(burdon): Separate options param for filter.
    const filter = { ...rest };
    if (type) {
      filter.__type_url = type;
    }

    // Whether it was requested or not, feedLevelIndexInfo is required internally.
    const { stream, unsubscribe } = this._subscriber.createSubscription(topic, filter, subscriptionOptions);

    const onData = bufferedStreamHandler(stream, async (messages) => {
      if (model.destroyed) return;

      if (this._onMessage) {
        messages = await Promise.all(messages.map(message => this._onMessage(message, options)));
      }

      messages = messages.filter(message => !!message);

      if (!feedInfo) {
        messages = messages.map(m => m.data);
      }

      await model.processMessages(messages);
      // metrics.inc(`model.${model.id}.length`, messages.length);
    }, batchPeriod);

    const forEachMessage = new Writable({
      objectMode: true,
      write (chunk, _, cb) {
        onData(chunk, cb);
      }
    });

    pump(stream, forEachMessage, () => {
      if (!model.destroyed) {
        model.destroy();
      }
    });

    //
    // Clean-up.
    //

    model.once('destroy', () => {
      unsubscribe();
    });

    // createTimer.end();

    return model;
  }

  destroyModel (model) {
    // metrics.delete(`model.${model.id}`);
    return model.destroy();
  }
}
