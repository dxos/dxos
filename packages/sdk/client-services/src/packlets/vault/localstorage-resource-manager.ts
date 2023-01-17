//
// Copyright 2023 DXOS.org
//

import { v4 as uuid } from 'uuid';

import { Trigger } from '@dxos/async';
import { log, logInfo } from '@dxos/log';
import { MaybePromise } from '@dxos/util';

type Resource = {
  id: string;
  time: number;
};

export type LocalStorageResourceManagerParams = {
  key: string;
  id?: string;
  onAcquired?: () => MaybePromise<void>;
  onReleased?: () => MaybePromise<void>;
};

export class LocalStorageResourceManager {
  @logInfo
  readonly key: string;

  @logInfo
  readonly id: string;

  private readonly _onAcquired?: () => MaybePromise<void>;
  private readonly _onReleased?: () => MaybePromise<void>;
  private _trigger = new Trigger();

  constructor({ key, id, onAcquired, onReleased }: LocalStorageResourceManagerParams) {
    this.key = key;
    this.id = id ?? uuid();
    this._onAcquired = onAcquired;
    this._onReleased = onReleased;

    window.addEventListener('storage', this._onStorageEvent.bind(this));
  }

  get releaseKey() {
    return `${this.key}-released`;
  }

  async acquire() {
    log('acquiring...', { key: this.key, id: this.id });
    const id = this._currentId();
    localStorage.setItem(this.key, JSON.stringify({ id: this.id, time: Date.now() }));
    if (id && id !== this.id) {
      this._trigger = new Trigger();
      await this._trigger.wait();
    }
    await this._onAcquired?.();
    log('acquired');
  }

  async release() {
    log('releasing...');
    localStorage.removeItem(this.key);
    await this._onReleased?.();
    log('released');
  }

  private async _onStorageEvent(event: StorageEvent) {
    log('storage event', { key: event.key, oldValue: event.oldValue, newValue: event.newValue });
    const data = event.newValue && this._parseData(event.newValue);
    if (!data) {
      return;
    }

    switch (event.key) {
      // Another window has acquired the resource, release it and notify the other window.
      case this.key: {
        if (data.id !== this.id) {
          await this._onReleased?.();
          localStorage.setItem(this.releaseKey, JSON.stringify({ id: this.id, time: Date.now() }));
        }
        break;
      }

      // Another window has released the resource, move forward with acquire if waiting.
      case this.releaseKey: {
        if (data.id !== this.id) {
          this._trigger.wake();
          localStorage.removeItem(this.releaseKey);
        }
        break;
      }
    }
  }

  private _currentId(): string | undefined {
    const result = localStorage.getItem(this.key);
    const data = result && this._parseData(result);
    if (!data) {
      return undefined;
    }

    return data.id;
  }

  private _parseData(data: string): Resource | undefined {
    try {
      return JSON.parse(data) as Resource;
    } catch (err) {
      return undefined;
    }
  }
}
