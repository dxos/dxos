//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore } from 'hypercore';
import util from 'node:util';

import { PublicKey } from '@dxos/keys';

export type WriteReceipt = {
  feedKey: PublicKey
  seq: number
}

export interface FeedWriter<T> {
  append (data: T): Promise<WriteReceipt>
}

/**
 * Async feed writer.
 */
export class FeedWriterImpl<T> implements FeedWriter<T> {
  private readonly _feedKey: PublicKey;

  constructor (
    private readonly _hypercore: Hypercore
  ) {
    assert(this._hypercore);
    this._feedKey = PublicKey.from(this._hypercore.key);
  }

  // TODO(burdon): Returning the feed key is a convenience that should be provided by a closure.
  async append (data: T): Promise<WriteReceipt> {
    const seq = await this._append(data as any);
    return {
      feedKey: this._feedKey,
      seq
    };
  }

  _append = util.promisify(this._hypercore.append.bind(this._hypercore));
}
