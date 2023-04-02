//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { inspect } from 'node:util';

import { Space } from '@dxos/client';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { log } from '@dxos/log';

/**
 * Adds info to records.
 */
export abstract class Bot {
  protected _config?: Config;
  protected _space?: Space;

  constructor(private readonly _id: string) {
    assert(this._id);
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return { id: this._id };
  }

  toString() {
    return `Bot(${JSON.stringify(this.toJSON())})`;
  }

  get id() {
    return this._id;
  }

  get config(): Config {
    return this._config!;
  }

  get space(): Space {
    return this._space!;
  }

  async init(config: Config, space: Space) {
    assert(config);
    assert(space);
    this._config = config;
    this._space = space;

    try {
      log('initializing...');
      return await this.onInit();
    } catch (err) {
      log.catch('initializing', err);
      throw err;
    }
  }

  async start() {
    try {
      log('starting...');
      return await this.onStart();
    } catch (err) {
      log.catch('starting', err);
      throw err;
    }
  }

  async stop() {
    try {
      log('stopping...');
      return await this.onStop();
    } catch (err) {
      log.catch('stopping', err);
      throw err;
    }
  }

  async onInit(): Promise<void> {}
  abstract onStart(): Promise<void>;
  abstract onStop(): Promise<void>;
}
