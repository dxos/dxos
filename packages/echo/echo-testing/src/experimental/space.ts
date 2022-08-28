//
// Copyright 2022 DXOS.org
//

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';

import { FeedStore, Pipeline } from './pipeline';

export class Space {
  private _key?: PublicKey;
  readonly feedStore = new FeedStore();
  readonly pipeline = new Pipeline(this.feedStore);

  get key () {
    return this._key;
  }

  toString () {
    return `Space(${this._key ? truncateKey(this._key) : ''})`;
  }

  async initialize (key: PublicKey) {
    this._key = key;
  }
}
