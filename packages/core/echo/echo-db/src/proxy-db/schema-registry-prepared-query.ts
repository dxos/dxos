//
// Copyright 2024 DXOS.org
//

import { type CleanupFn, Event, Mutex } from '@dxos/async';
import { log } from '@dxos/log';

import type { SchemaRegistryPreparedQuery } from './schema-registry-api';

export interface SchemaRegistryQueryResolver<T> {
  changes: Event<void>;

  /**
   * Start reactive query.
   */
  start(): Promise<void>;

  /**
   * Stop reactive query.
   */
  stop(): Promise<void>;

  getResults(): Promise<T[]>;
  getResultsSync(): T[];
}

/**
 * API for the schema queries.
 */
export class SchemaRegistryPreparedQueryImpl<T> implements SchemaRegistryPreparedQuery<T> {
  private readonly _mutex = new Mutex();
  private readonly _changes = new Event<this>();
  private _isReactiveQueryRunning = false;
  private _subscriberCount = 0;
  private _isFiring = false;

  constructor(private readonly _resolver: SchemaRegistryQueryResolver<T>) {}

  get results(): T[] {
    if (!this._isReactiveQueryRunning && !this._isFiring) {
      throw new Error(
        'Query must have at least 1 subscriber for `.results` to be used. Use query.run() for single-use result retrieval.',
      );
    }
    return this._resolver.getResultsSync();
  }

  run(): Promise<T[]> {
    return this._resolver.getResults();
  }

  runSync(): T[] {
    return this._resolver.getResultsSync();
  }

  async first(): Promise<T> {
    const results = await this._resolver.getResults();
    if (results.length === 0) {
      throw new Error('Query returned 0 entries');
    }

    return results[0];
  }

  async firstOrUndefined(): Promise<T | undefined> {
    const results = await this._resolver.getResults();
    return results[0];
  }

  subscribe(cb?: (self: this) => void, opts?: { fire?: boolean }): CleanupFn {
    if (cb) {
      this._changes.on(cb);
    }
    this._subscriberCount++;
    this._onSubscriberCountChange();

    if (opts?.fire) {
      if (!cb) {
        throw new Error('Cannot fire without a callback');
      }
      try {
        this._isFiring = true;
        cb(this);
      } finally {
        this._isFiring = false;
      }
    }

    return () => {
      if (cb) {
        this._changes.off(cb);
      }
      this._subscriberCount--;
      this._onSubscriberCountChange();
    };
  }

  private _onSubscriberCountChange(): void {
    if (this._subscriberCount === 0) {
      this._stop();
    } else if (this._subscriberCount > 0) {
      this._start();
    }
  }

  private _start(): void {
    if (this._isReactiveQueryRunning) {
      return;
    }
    queueMicrotask(async () => {
      using _guard = await this._mutex.acquire();
      if (this._isReactiveQueryRunning) {
        return;
      }

      try {
        await this._resolver.start();
        this._isReactiveQueryRunning = true;
      } catch (err) {
        log.catch(err);
      }
    });
  }

  private _stop(): void {
    if (!this._isReactiveQueryRunning) {
      return;
    }
    queueMicrotask(async () => {
      using _guard = await this._mutex.acquire();
      if (!this._isReactiveQueryRunning) {
        return;
      }

      try {
        await this._resolver.stop();
        this._isReactiveQueryRunning = false;
      } catch (err) {
        log.catch(err);
      }
    });
  }
}
