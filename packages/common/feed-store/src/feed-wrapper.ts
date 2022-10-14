//
// Copyright 2022 DXOS.org
//

import { Hypercore, HypercoreProperties } from 'hypercore';

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

  get core (): Hypercore {
    return this._hypercore;
  }

  get properties (): HypercoreProperties {
    return this._hypercore;
  }

  open = this._py(this._hypercore.open);
  close = this._py(this._hypercore.close);

  append = this._py(this._hypercore.append);

  _py (f: Function) {
    return py(this._hypercore, f);
  }
}
