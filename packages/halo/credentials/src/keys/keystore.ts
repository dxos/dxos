//
// Copyright 2019 DXOS.org
//

import bufferJson from 'buffer-json-encoding';
import debug from 'debug';
import encode from 'encoding-down';
import levelup, { LevelUp } from 'levelup';
import memdown from 'memdown';
import assert from 'node:assert';
import toArray from 'stream-to-array';

import { PublicKey } from '@dxos/protocols';

import { KeyRecord } from '../proto';

const log = debug('dxos:halo:keys:keystore'); // eslint-disable-line unused-imports/no-unused-vars

const marshaller = {
  marshall: (record: KeyRecord) => ({ ...record, publicKey: record.publicKey.asBuffer() }),
  unmarshall: (raw: any): KeyRecord => ({ ...raw, publicKey: PublicKey.from(raw.publicKey) })
};

/**
 * LevelDB key storage.
 */
export class KeyStore {
  private readonly _db: LevelUp

  /**
   * Takes the underlying to DB to use (eg, a leveldown, memdown, etc. instance).
   * If none is specified, memdown is used.
   */
  constructor (db: any = memdown()) {
    this._db = levelup(encode(db || memdown(), { valueEncoding: bufferJson }));
  }

  /**
   * Adds a KeyRecord to the KeyStore, indexed by `key`.
   */
  async setRecord (key: string, record: KeyRecord) {
    assert(key);
    assert(record);

    return this._db.put(key, marshaller.marshall(record));
  }

  /**
   * Deletes a KeyRecord from the KeyStore, indexed by `key`.
   */
  async deleteRecord (key: string) {
    assert(key);

    await this._db.del(key);
  }

  /**
   * Looks up a KeyRecord by `key`.
   */
  async getRecord (key: string): Promise<KeyRecord> {
    assert(key);

    return marshaller.unmarshall(await this._db.get(key));
  }

  /**
   * Returns all lookup key strings.
   */
  async getKeys (): Promise<string[]> {
    return toArray(this._db.createKeyStream({ asBuffer: false }));
  }

  /**
   * Returns all KeyRecord values.
   */
  async getRecords (): Promise<KeyRecord[]> {
    const records = await toArray(this._db.createValueStream({ asBuffer: false }));
    return records.map(record => marshaller.unmarshall(record));
  }

  /**
   * Returns all entries as key/value pairs.
   */
  async getRecordsWithKey (): Promise<[string, KeyRecord][]> {
    const entries = await toArray(this._db.createReadStream({ keyAsBuffer: false, valueAsBuffer: false }));
    return entries.map(pair => [pair.key, marshaller.unmarshall(pair.value)]);
  }
}
