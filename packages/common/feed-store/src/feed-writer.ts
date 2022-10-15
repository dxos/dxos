//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore } from 'hypercore';
import util from 'node:util';

/**
 * Async feed writer.
 */
export class FeedWriter<T> {
  constructor (
    private readonly _hypercore: Hypercore
  ) {
    assert(this._hypercore);
  }

  async append (data: T): Promise<number | undefined> {
    return this._append(data as any);
  }

  _append = util.promisify(this._hypercore.append.bind(this._hypercore));
}
