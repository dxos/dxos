//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Filter } from './filter';
import { filterMatch } from './query';
import { Expando } from '../object';

describe('Filter', () => {
  test('properties', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });

    expect(filterMatch(Filter.from({ title: 'test' }), object)).to.be.true;
    expect(filterMatch(Filter.from({ value: 100 }), object)).to.be.true;
    expect(filterMatch(Filter.from({ complete: false }), object)).to.be.false;
    expect(filterMatch(Filter.from({ missing: undefined }), object)).to.be.true;
  });

  test('and', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ title: 'test' });
    const filter2 = Filter.from({ value: 100 });
    const filter3 = Filter.from({ complete: true });

    expect(filterMatch(Filter.and(filter1, filter2, filter3), object)).to.be.true;
    expect(filterMatch(Filter.from([filter1, filter2, filter3]), object)).to.be.true;
  });

  test('or', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ value: 200 });
    const filter2 = Filter.from({ title: 'test' });
    const filter3 = Filter.from({ complete: false });

    expect(filterMatch(Filter.or(filter1, filter2, filter3), object)).to.be.true;
  });

  test('not', () => {
    const object = new Expando({ title: 'test' });

    const filter1 = Filter.from({ title: 'test' });
    const filter2 = Filter.not(filter1);

    expect(filterMatch(filter1, object)).to.be.true;
    expect(filterMatch(filter2, object)).to.be.false;
  });

  test('complex', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ title: 'bad' });
    const filter2 = Filter.from({ value: 0 });
    expect(filterMatch(Filter.not(Filter.or(filter1, filter2)), object)).to.be.true;
  });

  // TODO(burdon): Test schema.
});
