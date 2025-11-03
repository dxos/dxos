//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { randomInt } from './random';
import { createBucketReducer, numericalValues, reduceGroupBy, reduceSeries, reduceSet } from './reducers';
import { Tracer } from './tracer';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe('Tracer', () => {
  test('simple time-series', async () => {
    const tracer = new Tracer().start();
    const key = 'test';

    const n = 20;
    for (let i = 0; i < n; i++) {
      tracer.emit(key);
      await sleep(randomInt(10));
    }

    const events = tracer.get('test')!;
    expect(events).to.have.length(n);

    const buckets = reduceSeries(createBucketReducer(10), events);
    expect(buckets.length).to.be.greaterThan(1);
    expect(buckets.length).to.be.lessThan(n);

    const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    expect(total).to.equal(n);
  });

  test('filter and group', async () => {
    const tracer = new Tracer().start();
    const key = 'test';

    const n = 30;
    const objectIds = ['a', 'b', 'c'];
    for (let i = 0; i < n; i++) {
      tracer.emit(key, { id: objectIds[i % objectIds.length] });
    }

    const values = tracer.get('test')!;
    const uniqueObjectIds = Array.from(reduceSet(values, (event) => event.value.id).values());
    expect(uniqueObjectIds).to.deep.equal(objectIds);

    const groups = reduceGroupBy(values, (event) => event.value.id);
    expect(Array.from(groups.keys())).to.deep.equal(objectIds);

    const events = tracer.get('test', { id: uniqueObjectIds[0] });
    expect(events).to.have.length(n / objectIds.length);
  });

  test('numerical values', async () => {
    const tracer = new Tracer().start();
    const key = 'test';

    const n = 20;
    for (let i = 0; i < n; i++) {
      const event = tracer.mark(key);
      await sleep(Math.random() * 10);
      event.end();
    }

    const events = tracer.get('test')!;
    expect(events).to.have.length(n);

    const { min, max, mean, median, total, count } = numericalValues(events, (event) => event.duration!);
    expect(mean).to.be.greaterThan(1);
    // expect(mean).to.be.lessThan(10);
    expect(Math.round(total)).to.eq(Math.round(mean! * count));
    expect(median).to.be.greaterThan(min!);
    expect(median).to.be.lessThan(max!);

    // console.log(numericalValues(events, (event) => event.duration!));
  });
});
