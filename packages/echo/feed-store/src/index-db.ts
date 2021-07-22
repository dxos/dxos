//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import pify from 'pify';

/**
 * Index feed descriptors.
 */
class IndexDB {
  public _hypertrie: any;
  public _db: any;

  /**
   * @constructor
   * @param {Hypertrie} hypertrie
   */
  constructor (hypertrie: any) {
    assert(hypertrie);

    this._hypertrie = hypertrie;

    this._db = {
      put: pify(hypertrie.put.bind(hypertrie)),
      get: pify(hypertrie.get.bind(hypertrie)),
      delete: pify(hypertrie.del.bind(hypertrie)),
      list: pify(hypertrie.list.bind(hypertrie)),
      close: pify(hypertrie.feed.close.bind(hypertrie.feed))
    };
  }

  async list (path: string) {
    const list = await this._db.list(`${path}/`);
    return list.map((x: any) => x.value);
  }

  async get (key: string) {
    const item = await this._db.get(key);
    return item && item.value;
  }

  async put (key: string, value: any) {
    return this._db.put(key, value);
  }

  async delete (key: string) {
    return this._db.delete(key);
  }

  async close () {
    return this._db.close();
  }
}

export default IndexDB;
