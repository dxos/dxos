//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { EchoDatabase } from '@dxos/echo-schema';
import { log } from '@dxos/log';

/**
 * Adds info to records.
 */
export abstract class Bot {
  protected _db?: EchoDatabase;

  get db(): EchoDatabase {
    assert(this._db);
    return this._db;
  }

  async init(db: EchoDatabase) {
    this._db = db;
    log('initializing...');
    await this.onInit();
  }

  async start() {
    log('starting...');
    return this.onStart();
  }

  async stop() {
    log('stopping...');
    return this.onStop();
  }

  async onInit(): Promise<void> {}

  abstract onStart(): Promise<void>;
  abstract onStop(): Promise<void>;
}
