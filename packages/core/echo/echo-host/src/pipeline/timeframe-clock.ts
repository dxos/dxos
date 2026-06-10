//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { timed } from '@dxos/debug';
import { type FeedIndex } from '@dxos/feed-store';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Timeframe } from '@dxos/timeframe';

export const mapTimeframeToFeedIndexes = (timeframe: Timeframe): FeedIndex[] =>
  timeframe.frames().map(([feedKey, index]) => ({ feedKey, index }));

export const mapFeedIndexesToTimeframe = (indexes: FeedIndex[]): Timeframe =>
  new Timeframe(indexes.map(({ feedKey, index }) => [feedKey, index]));

export const startAfter = (timeframe: Timeframe): FeedIndex[] =>
  timeframe.frames().map(([feedKey, index]) => ({ feedKey, index: index + 1 }));

/**
 * Keeps state of the last timeframe that was processed by ECHO.
 */
export class TimeframeClock {
  readonly update = new Event<Timeframe>();

  private _pendingTimeframe: Timeframe;

  constructor(private _timeframe = new Timeframe()) {
    this._pendingTimeframe = _timeframe;
  }

  /**
   * Timeframe that was processed by ECHO.
   */
  get timeframe() {
    return this._timeframe;
  }

  /**
   * Timeframe that is currently being processed by ECHO.
   * Will be equal to `timeframe` after the processing is complete.
   */
  get pendingTimeframe() {
    return this._pendingTimeframe;
  }

  setTimeframe(timeframe: Timeframe): void {
    this._timeframe = timeframe;
    this._pendingTimeframe = timeframe;
    this.update.emit(this._timeframe);
  }

  updatePendingTimeframe(key: PublicKey, seq: number): void {
    this._pendingTimeframe = Timeframe.merge(this._pendingTimeframe, new Timeframe([[key, seq]]));
  }

  updateTimeframe(): void {
    this._timeframe = this._pendingTimeframe;
    this.update.emit(this._timeframe);
  }

  hasGaps(timeframe: Timeframe): boolean {
    const gaps = Timeframe.dependencies(timeframe, this._timeframe);
    return !gaps.isEmpty();
  }

  @timed(5_000)
  async waitUntilReached(target: Timeframe): Promise<void> {
    log('waitUntilReached', { target, current: this._timeframe });
    await this.update.waitForCondition(() => {
      log('check if reached', {
        target,
        current: this._timeframe,
        deps: Timeframe.dependencies(target, this._timeframe),
      });

      return Timeframe.dependencies(target, this._timeframe).isEmpty();
    });
  }
}
