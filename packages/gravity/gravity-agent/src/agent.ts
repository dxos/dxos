//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Client, fromHost } from '@dxos/client';
import { ConfigProto } from '@dxos/config';

/**
 * Test agent.
 */
export class Agent {
  private _client?: Client;
  private _running?: boolean = false;

  // prettier-ignore
  constructor (
    private readonly _config: ConfigProto
  ) {}

  get started() {
    return this._running;
  }

  get client() {
    return this._client;
  }

  async initialize() {
    assert(!this._client);
    this._client = new Client({ config: this._config, services: fromHost(this._config) });
    await this._client.initialize();
    await this._client.halo.createProfile();
  }

  async destroy() {
    assert(this._client);
    await this.stop();
    await this._client.destroy();
    this._client = undefined;
  }

  async start() {
    assert(this._client);
    if (!this._running) {
      this._running = true;
    }
  }

  async stop() {
    assert(this._client);
    if (this._running) {
      this._running = false;
    }
  }
}
