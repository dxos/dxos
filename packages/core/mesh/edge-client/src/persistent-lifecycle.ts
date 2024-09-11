//
// Copyright 2024 DXOS.org
//

import { DeferredTask, sleep, synchronized } from '@dxos/async';
import { cancelWithContext, LifecycleState, Resource } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { log } from '@dxos/log';

const INIT_RESTART_DELAY = 100;
const DEFAULT_MAX_RESTART_DELAY = 5000;

export type PersistentLifecycleParams = {
  /**
   * Create connection.
   * If promise resolves successfully, connection is considered established.
   */
  start: () => Promise<void>;

  /**
   * Reset connection to initial state.
   */
  stop: () => Promise<void>;

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
export class PersistentLifecycle extends Resource {
  private readonly _start: () => Promise<void>;
  private readonly _stop: () => Promise<void>;
  private readonly _onRestart?: () => Promise<void>;
  private readonly _maxRestartDelay: number;

  private _restartTask?: DeferredTask = undefined;
  private _restartAfter = 0;

  constructor({ start, stop, onRestart, maxRestartDelay = DEFAULT_MAX_RESTART_DELAY }: PersistentLifecycleParams) {
    super();
    this._start = start;
    this._stop = stop;
    this._onRestart = onRestart;
    this._maxRestartDelay = maxRestartDelay;
  }

  @synchronized
  protected override async _open() {
    this._restartTask = new DeferredTask(this._ctx, async () => {
      try {
        await this._restart();
      } catch (err) {
        log.warn('Restart failed', { err });
        this._restartTask?.schedule();
      }
    });
    await this._start().catch((err) => {
      log.warn('Restart failed', { err });
      this._restartTask?.schedule();
    });
  }

  protected override async _close() {
    await this._restartTask?.join();
    await this._stop();
    this._restartTask = undefined;
  }

  private async _restart() {
    log(`restarting in ${this._restartAfter}ms`, { state: this._lifecycleState });
    await this._stop();
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }
    await cancelWithContext(this._ctx!, sleep(this._restartAfter));
    this._restartAfter = Math.min(Math.max(this._restartAfter * 2, INIT_RESTART_DELAY), this._maxRestartDelay);

    // May fail if the connection is not established.
    await warnAfterTimeout(5_000, 'Connection establishment takes too long', () => this._start());

    this._restartAfter = 0;
    await this._onRestart?.();
  }

  /**
   * Scheduling restart should be done from outside.
   */
  @synchronized
  scheduleRestart() {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }
    this._restartTask!.schedule();
  }
}
