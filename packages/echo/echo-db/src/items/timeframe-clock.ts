//
// Copyright 2020 DXOS.org
//

import { FeedKey, Timeframe } from '@dxos/echo-protocol';
import { Event } from '@dxos/util';

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
}
