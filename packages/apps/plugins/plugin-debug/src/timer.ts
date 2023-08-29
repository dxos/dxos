//
// Copyright 2023 DXOS.org
//

import { Event, ReadOnlyEvent } from '@dxos/async';
import { log } from '@dxos/log';

export type TimerOptions = { count: number; interval: number; jitter?: number };

export type TimerCallback = (i: number) => Promise<boolean | void>;

// TODO(burdon): Move to @dxos/async.
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

  start(options: TimerOptions, cb?: () => void) {
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
          const start = Date.now();
          await this._callback(this._count++);
          const elapsed = Date.now() - start;
          if (elapsed > interval) {
            log.warn(`Stopping: interval is too short: [${elapsed} > ${options.interval}]`);
            stop();
          } else {
            run();
          }
        }, interval);
      }
    };

    log.info('starting...', options);
    this._state.emit(true);
    this._count = 0;

    // Start asynchronously (give caller chance to register event listener).
    setTimeout(run);
    return this;
  }

  stop() {
    clearInterval(this._timer);
    this._timer = undefined;
    log.info('stopped', { count: this._count });
    this._state.emit(false);
    return this;
  }
}
