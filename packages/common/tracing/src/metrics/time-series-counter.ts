import { BaseCounter } from "./base";

const MAX_BUCKETS = 60;

export class TimeSeriesCounter extends BaseCounter {
  private _currentValue = 0;
  private _totalValue = 0;
  private _buckets: number[] = [];

  inc(by = 1) {
    this._currentValue += by;
    this._totalValue += by;
  }

  override _tick(time: number, delta: number): void {
    this._buckets.push(this._currentValue);
    if (this._buckets.length > MAX_BUCKETS) {
      this._buckets.shift();
    }
    this._currentValue = 0;
  }

  override getData(): Record<string, any> {
    return {
      total: this._totalValue,
      buckets: this._buckets,
    };
  }
}