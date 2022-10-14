//
// Copyright 2022 DXOS.org
//

import { Hypercore, HypercoreProperties } from 'hypercore';
import util from 'node:util';

import { py } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

/**
 * Async feed wrapper.
 */
export class FeedWrapper {
  constructor (
    private _hypercore: Hypercore,
    private _key: PublicKey // TODO(burdon): Required since currently patching the key inside factory.
  ) {}

  get key (): PublicKey {
    return this._key;
  }

  get properties (): HypercoreProperties {
    return this._hypercore;
  }

  open = util.promisify(this._hypercore.open).bind(this._hypercore);

  // open = this._py(this._hypercore.open);
  close = this._py(this._hypercore.close);
  append = this._py(this._hypercore.append);

  replicate = this._hypercore.replicate;

  _py (fn: Function) {
    return py(this._hypercore, fn);
  }
}
