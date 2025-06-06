//
// Copyright 2023 DXOS.org
//

import { Event, type ReadOnlyEvent } from './events';

export type TimerOptions = { count: number; interval: number; jitter?: number };

export type TimerCallback = (i: number) => Promise<boolean | void>;

/**
 * Manages callback invocations at a interval with a possible jitter.
 * Note: The interval excludes the running time of the callback.
 */
export class Timer {
  private readonly _state = new Event<boolean>();
  private _timer?: NodeJS.Timeout;
  private _count = 0;

  constructor(private readonly _callback: TimerCallback) {}

  get state(): ReadOnlyEvent<boolean> {
    return this._state;
  }

  get running() {
    return !!this._timer;
  }

  start(options: TimerOptions, cb?: () => void): this {
    if (isNaN(options.count) || isNaN(options.interval)) {
      throw new Error(`Invalid options: ${JSON.stringify(options)}`);
    }

    if (this.running) {
      this.stop();
    }

    const stop = () => {
      this.stop();
      cb?.();
    };

    const run = () => {
      if (this._count >= (options.count ?? 0)) {
        stop();
      } else {
        const interval = (options.interval ?? 0) + Math.random() * (options.jitter ?? 0);
        this._timer = setTimeout(async () => {
          await this._callback(this._count++);
          run();
        }, interval);
      }
    };

    this._state.emit(true);
    this._count = 0;

    // Start asynchronously (give caller chance to register event listener).
    setTimeout(run);
    return this;
  }

  stop(): this {
    clearInterval(this._timer);
    this._timer = undefined;
    this._state.emit(false);
    return this;
  }
}
