//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore, HypercoreProperties } from 'hypercore';
import { Readable } from 'streamx';
import { inspect } from 'util';

import { inspectObject } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { createBinder } from '@dxos/util';

import { FeedWriter } from './feed-writer';
import { log } from '@dxos/log';

/**
 * Async feed wrapper.
 */
export class FeedWrapper<T extends {}> {
  private readonly _binder = createBinder(this._hypercore);

  constructor(
    private _hypercore: Hypercore<T>,
    private _key: PublicKey // TODO(burdon): Required since currently patching the key inside factory.
  ) {
    assert(this._hypercore);
    assert(this._key);
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      feedKey: this._key,
      length: this.properties.length,
      opened: this.properties.opened,
      closed: this.properties.closed
    };
  }

  get key(): PublicKey {
    return this._key;
  }

  get core(): Hypercore<T> {
    return this._hypercore;
  }

  // TODO(burdon): Create proxy.
  get properties(): HypercoreProperties {
    return this._hypercore;
  }

  createReadableStream(): Readable {
    return this._hypercore.createReadStream({ live: true });
  }

  createFeedWriter(): FeedWriter<T> {
    return {
      write: async (data: T) => {
        log('write', { feed: this._key, seq: this._hypercore.length, data });
        const seq = await this.append(data);
        log('write complete', { feed: this._key, seq });
        return {
          feedKey: this.key,
          seq
        };
      }
    };
  }

  on = this._binder.fn(this._hypercore.on);
  off = this._binder.fn(this._hypercore.off);

  open = this._binder.async(this._hypercore.open);
  close = this._binder.async(this._hypercore.close);

  get = this._binder.async(this._hypercore.get);
  append = this._binder.async(this._hypercore.append);
  download = this._binder.async(this._hypercore.download);

  replicate = this._binder.fn(this._hypercore.replicate);
}
