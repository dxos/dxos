//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore, HypercoreProperties } from 'hypercore';
import { Readable } from 'readable-stream';

import { createReadable } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { createBinder } from '@dxos/util';

import { FeedWriter } from './feed-writer';

/**
 * Async feed wrapper.
 */
export class FeedWrapper<T extends {}> {
  private readonly _binder = createBinder(this._hypercore);

  constructor (
    private _hypercore: Hypercore<T>,
    private _key: PublicKey // TODO(burdon): Required since currently patching the key inside factory.
  ) {
    assert(this._hypercore);
    assert(this._key);
  }

  get key (): PublicKey {
    return this._key;
  }

  get core (): Hypercore<T> {
    return this._hypercore;
  }

  // TODO(burdon): Create proxy.
  get properties (): HypercoreProperties {
    return this._hypercore;
  }

  createReadableStream (): Readable {
    const feedStream = this._hypercore.createReadStream({ live: true });
    return createReadable(feedStream);
  }

  createFeedWriter (): FeedWriter<T> {
    return {
      write: async (data: T) => {
        const seq = await this.append(data);
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
