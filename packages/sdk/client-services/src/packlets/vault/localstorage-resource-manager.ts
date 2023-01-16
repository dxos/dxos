//
// Copyright 2023 DXOS.org
//

import { v4 as uuid } from 'uuid';

import { log, logInfo } from '@dxos/log';
import { MaybePromise } from '@dxos/util';

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

  constructor({ key, id, onAcquired, onReleased }: LocalStorageResourceManagerParams) {
    this.key = key;
    this.id = id ?? uuid();
    this._onAcquired = onAcquired;
    this._onReleased = onReleased;

    window.addEventListener('storage', this._onStorageEvent.bind(this));
  }

  hasAcquired() {
    const id = this._currentId();
    return id === this.id;
  }

  async acquire() {
    log('acquiring...', { key: this.key, id: this.id });
    localStorage.setItem(this.key, JSON.stringify({ id: this.id, time: Date.now() }));
    await this._onAcquired?.();
    log('acquired');
  }

  async release() {
    log('releasing...');
    localStorage.removeItem(this.key);
    await this._onReleased?.();
    log('released');
  }

  private _onStorageEvent(event: StorageEvent) {
    if (event.key !== this.key) {
      return;
    }

    log('storage event', { oldValue: event.oldValue, newValue: event.newValue });

    try {
      const data = event.newValue && JSON.parse(event.newValue);
      if (data && data.id !== this.id) {
        void this._onReleased?.();
      }
    } catch (err) {}
  }

  private _currentId(): string | null {
    const result = localStorage.getItem(this.key);
    try {
      return result && JSON.parse(result).id;
    } catch (err) {
      return null;
    }
  }
}
