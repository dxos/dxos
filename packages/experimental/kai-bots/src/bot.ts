//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { Space } from '@dxos/client';
import { Config } from '@dxos/config';
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
