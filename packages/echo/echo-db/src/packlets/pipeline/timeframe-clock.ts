//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { timed } from '@dxos/debug';
import { FeedKey } from '@dxos/echo-protocol';
import { Timeframe } from '@dxos/protocols';
import { log } from '@dxos/log';

/**
 * Keeps state of the last timeframe that was processed by ECHO.
 */
export class TimeframeClock {
  readonly update = new Event<Timeframe>();

  constructor (
    private _timeframe = new Timeframe()
  ) {}

  get timeframe () {
    return this._timeframe;
  }

  updateTimeframe (key: FeedKey, seq: number) {
    this._timeframe = Timeframe.merge(this._timeframe, new Timeframe([[key, seq]]));
    this.update.emit(this._timeframe);
  }

  hasGaps (timeframe: Timeframe) {
    const gaps = Timeframe.dependencies(timeframe, this._timeframe);
    return !gaps.isEmpty();
  }

  @timed(5_000)
  async waitUntilReached (target: Timeframe) {
    log.debug(`waitUntilReached`, { target, current: this._timeframe });
    await this.update.waitForCondition(() => Timeframe.dependencies(target, this._timeframe).isEmpty());
  }
}
