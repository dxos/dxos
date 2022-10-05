//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import fetch from 'isomorphic-fetch';
import urljoin from 'url-join';

import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

import { defaultConfig, Command } from '../common';

// TODO(burdon): Integrate with @dxos/log

/**
 * Posts logs to server.
 */
export class Spy {
  private static _count = 0;

  private readonly id = Spy._count++;
  private _bindings = new Map<string, Set<any>>();
  private _enabled = true;

  constructor (
    private readonly _config = defaultConfig
  ) {
    console.log('### SPY ###', this.id);
  }

  humanize (key: PublicKey) {
    assert(key);
    return humanize(key);
  }

  enable (enable = true) {
    this._enabled = enable;
    return this;
  }

  /**
   * Bind the object instance to the key.
   */
  bind2 (key: PublicKey | string, object: any, label?: string) {
    const keyString = (typeof key === 'string') ? key : humanize(key);
    let bindings = this._bindings.get(keyString);
    if (!bindings) {
      bindings = new Set();
      this._bindings.set(keyString, bindings);
    }

    bindings.add(object);
    console.log(`### BIND(${this.id}:${this._bindings.size}) ###`, object.id);
    return this;
  }

  /**
   * Log the message with the given key or bound object.
   */
  async log (key: any, data: any) {
    assert(key);
    if (this._enabled) {
      let label;
      let keyValue: string;
      if (typeof key === 'string') {
        keyValue = key;
      } else if (key instanceof PublicKey) {
        keyValue = humanize(key);
      } else {
        const value = Array.from(this._bindings.entries()).find(([, bindings]) => {
          return bindings.has(key);
        });

        assert(value, `### Object not bound: ${key} (${this.id}:${this._bindings.size}) ### ${key.id}`);
        keyValue = value[0];
      }

      await this._post({ cmd: Command.LOG, data: { key: keyValue, data } });
    }

    return this;
  }

  async mark (label: string) {
    if (this._enabled) {
      await this._post({ cmd: Command.MARK, label: label.replace(/\W+/g, '-') });
    }

    return this;
  }

  /**
   * Clear the log.
   */
  async clear () {
    console.log(`### RESET(${this.id}:${this._bindings.size}) ###`);
    this._bindings.clear();
    if (this._enabled) {
      await this._post({ cmd: Command.CLEAR });
    }

    return this;
  }

  async _post (data: any) {
    const { hostname, port, path } = this._config;
    const url = urljoin(`http://${hostname}:${port}`, path);

    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }
}

// Singleton
export const spy = new Spy();
