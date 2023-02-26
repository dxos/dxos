//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { EchoDatabase } from '@dxos/echo-schema';

/**
 * Adds info to records.
 */
export abstract class Bot {
  protected _db?: EchoDatabase;

  get db(): EchoDatabase {
    assert(this._db);
    return this._db!;
  }

  async init(db: EchoDatabase) {
    this._db = db;
  }

  async start() {
    return this.onStart();
  }

  async stop() {
    return this.onStop();
  }

  abstract onStart(): Promise<void>;
  abstract onStop(): Promise<void>;
}
