//
// Copyright 2024 DXOS.org
//

import { LifecycleState, Resource, cancelWithContext } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { log } from '@dxos/log';

import { synchronized } from './mutex';
import { DeferredTask } from './task-scheduling';
import { sleep } from './timeout';

const INIT_RESTART_DELAY = 100;
const DEFAULT_MAX_RESTART_DELAY = 5000;

export type PersistentLifecycleProps<T> = {
  /**
   * Create connection.
   * If promise resolves successfully, connection is considered established.
   */
  start: () => Promise<T | undefined>;

  /**
   * Reset connection to initial state.
   */
  stop: (state: T) => Promise<void>;

  /**
   * Called after successful start.
   */
  onRestart?: () => Promise<void>;

  /**
   * Maximum delay between restartion attempts.
   * Default: 5000ms
   */
  maxRestartDelay?: number;
};

/**
 * Handles restarts (e.g. persists connection).
 * Restarts are scheduled with exponential backoff.
 */
export class PersistentLifecycle<T> extends Resource {
  private readonly _start: () => Promise<T | undefined>;
  private readonly _stop: (state: T) => Promise<void>;
  private readonly _onRestart?: () => Promise<void>;
  private readonly _maxRestartDelay: number;

  private _currentState: T | undefined = undefined;
  private _restartTask?: DeferredTask = undefined;
  private _restartAfter = 0;

  constructor({ start, stop, onRestart, maxRestartDelay = DEFAULT_MAX_RESTART_DELAY }: PersistentLifecycleProps<T>) {
    super();
    this._start = start;
    this._stop = stop;
    this._onRestart = onRestart;
    this._maxRestartDelay = maxRestartDelay;
  }

  get state() {
    return this._currentState;
  }

  @synchronized
  protected override async _open(): Promise<void> {
    this._restartTask = new DeferredTask(this._ctx, async () => {
      try {
        await this._restart();
      } catch (err) {
        log.warn('Restart failed', { err });
        this._restartTask?.schedule();
      }
    });

    this._currentState = await this._start().catch((err) => {
      log.warn('Start failed', { err });
      this._restartTask?.schedule();
      return undefined;
    });
  }

  protected override async _close(): Promise<void> {
    await this._restartTask?.join();
    await this._stopCurrentState();
    this._restartTask = undefined;
  }

  private async _restart(): Promise<void> {
    log(`restarting in ${this._restartAfter}ms`, { state: this._lifecycleState });
    await this._stopCurrentState();
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }
    await cancelWithContext(this._ctx!, sleep(this._restartAfter));
    this._restartAfter = Math.min(Math.max(this._restartAfter * 2, INIT_RESTART_DELAY), this._maxRestartDelay);

    // May fail if the connection is not established.
    await warnAfterTimeout(5_000, 'Connection establishment takes too long', async () => {
      this._currentState = await this._start();
    });

    this._restartAfter = 0;
    await this._onRestart?.();
  }

  private async _stopCurrentState(): Promise<void> {
    if (this._currentState) {
      try {
        await this._stop(this._currentState);
      } catch (err) {
        log.catch(err);
      }
      this._currentState = undefined;
    }
  }

  /**
   * Scheduling restart should be done from outside.
   */
  @synchronized
  async scheduleRestart(): Promise<void> {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }
    this._restartTask!.schedule();
  }
}
