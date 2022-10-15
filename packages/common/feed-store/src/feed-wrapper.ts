//
// Copyright 2022 DXOS.org
//

import { Hypercore, HypercoreProperties } from 'hypercore';
import { Readable } from 'readable-stream';

import { createReadable } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { createBinder } from '@dxos/util';

/**
 * Async feed wrapper.
 */
export class FeedWrapper {
  private readonly _binder = createBinder(this._hypercore);

  constructor (
    private _hypercore: Hypercore,
    private _key: PublicKey // TODO(burdon): Required since currently patching the key inside factory.
  ) {}

  get key (): PublicKey {
    return this._key;
  }

  get core (): Hypercore {
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

  on = this._binder.fn(this._hypercore.on);
  off = this._binder.fn(this._hypercore.off);

  open = this._binder.async(this._hypercore.open);
  close = this._binder.async(this._hypercore.close);

  get = this._binder.async(this._hypercore.get);
  getBatch = this._binder.async(this._hypercore.getBatch);
  append = this._binder.async(this._hypercore.append);
  download = this._binder.async(this._hypercore.download);

  replicate = this._binder.fn(this._hypercore.replicate);
}
