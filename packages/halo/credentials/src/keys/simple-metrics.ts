//
// Copyright 2020 DXOS.org
//

import performanceNow from 'performance-now';

/**
 * A simple class for keeping track of invocations and processing time.
 */
export class SimpleMetrics {
  private readonly _created = performanceNow();
  private readonly _counts = new Map<string, number>();
  private readonly _times = new Map<string, number>();

  inc (title: string) {
    let value = this._counts.get(title) ?? 0;
    this._counts.set(title, ++value);
    return value;
  }

  time (title: string) {
    const start = performanceNow();
    this.inc(title);
    return () => {
      const stop = performanceNow() - start;
      const value = this._times.get(title) ?? 0;
      this._times.set(title, value + stop);
      return stop;
    };
  }

  toString () {
    const counts = Array.from(this._counts.entries());
    counts.sort((a, b) => a[1] - b[1]);
    const countsStr = counts.map(([k, v]) => `${k}: ${v}`).join('\n ');

    const times = Array.from(this._times.entries());
    times.sort((a, b) => a[1] - b[1]);
    const timesStr = times.map(([k, v]) => `${k}: ${v.toFixed(2)}`).join('\n ');

    const elapsed = performanceNow() - this._created;

    return `COUNTS:\n ${countsStr}\n\nTIME (ms):\n ${timesStr}\n\nELAPSED (ms): ${elapsed.toFixed(2)}`;
  }
}

/**
 * A decorator for collecting metrics on methods.
 * @param metrics
 */
export const createMeter = (metrics: SimpleMetrics) => {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      const stop = metrics.time(method.name);
      const result = method.apply(this, args);
      if (!result || !result.finally) {
        stop();
        return result;
      } else {
        return result.finally(stop);
      }
    };
  };
};
