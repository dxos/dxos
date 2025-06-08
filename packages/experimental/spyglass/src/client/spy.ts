//
// Copyright 2022 DXOS.org
//

import fetch from 'isomorphic-fetch';
import urlJoin from 'url-join';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

import { defaultConfig, Command } from '../common';

// TODO(burdon): Integrate with @dxos/log

/**
 * Posts logs to server.
 */
export class Spy {
  private readonly id = PublicKey.random();

  // TODO(dmaretskyi): Use WeakMap so that references can get garbage-collected.
  private _bindings = new Map<string, Set<any>>();
  private _enabled = true;

  private _count = 0;

  constructor(private readonly _config = defaultConfig) {
    console.log(`### SPY(${this.info}) ###`);
  }

  get size() {
    return Array.from(this._bindings.values()).reduce((count, set) => count + set.size, 0);
  }

  get info() {
    return `${this.id.toHex().slice(0, 4)}[${this.size}]`;
  }

  humanize(key: PublicKey): string {
    invariant(key);
    return humanize(key);
  }

  enable(enable = true): this {
    this._enabled = enable;
    return this;
  }

  /**
   * Bind the object instance to the key.
   */
  bind(key: PublicKey | string, object: any, label?: string): this {
    const keyString = typeof key === 'string' ? key : humanize(key);
    let bindings = this._bindings.get(keyString);
    if (!bindings) {
      bindings = new Set();
      this._bindings.set(keyString, bindings);
    }

    // TODO(burdon): Check not bound to other key.
    invariant(!bindings.has(object), 'Already bound.');
    bindings.add(object);
    object.__spy = ++this._count;
    console.log(`### Bind(${this.info}) ###`, object.__spy, label);
    return this;
  }

  /**
   * Log the message with the given key or bound object.
   */
  async log(key: any, data: any, tmp?: string): Promise<this> {
    invariant(key);
    if (this._enabled) {
      let keyValue: string;
      if (typeof key === 'string') {
        keyValue = key;
      } else if (key instanceof PublicKey) {
        keyValue = humanize(key);
      } else {
        const value = Array.from(this._bindings.entries()).find(([, bindings]) => {
          return bindings.has(key);
        });

        invariant(value, `### Object not bound (${this.info}) ### ${key.__spy}:${tmp}`);
        keyValue = value[0];
      }

      const payload = { key: keyValue, data };
      await this._post({ cmd: Command.LOG, data: payload });
    }

    return this;
  }

  async mark(label: string): Promise<this> {
    if (this._enabled) {
      await this._post({ cmd: Command.MARK, label: label.replace(/\W+/g, '-') });
    }

    return this;
  }

  /**
   * Clear the log.
   */
  async clear(): Promise<this> {
    this._bindings.clear();
    if (this._enabled) {
      await this._post({ cmd: Command.CLEAR });
    }

    return this;
  }

  async _post(data: any): Promise<void> {
    const { hostname, port, path } = this._config;
    const url = urlJoin(`http://${hostname}:${port}`, path);

    try {
      // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
      await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      // Silently ignore.
    }
  }
}

// Singleton
export const spy = new Spy();
