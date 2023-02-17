//
// Copyright 2023 DXOS.org
//

// Copied from https://github.com/apollographql/apollo-client/tree/1d13de4f19/src/utilities/observables.

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Concast } from './concast';
import { ZenObservable } from './observable';

const toArrayPromise = <T>(observable: ZenObservable<T>): Promise<T[]> =>
  new Promise<T[]>((resolve, reject) => {
    const values: T[] = [];
    observable.subscribe({
      next: (value) => {
        values.push(value);
      },
      error: reject,
      complete: () => {
        resolve(values);
      }
    });
  });

describe('Observable subclassing', () => {
  test('Symbol.species is defined for Concast subclass', () => {
    const concast = new Concast([ZenObservable.of(1, 2, 3), ZenObservable.of(4, 5)]);
    expect(concast).to.be.instanceof(Concast);

    const mapped = concast.map((n) => n * 2);
    expect(mapped).to.be.instanceof(ZenObservable);
    expect(mapped).not.to.be.instanceof(Concast);

    return toArrayPromise(mapped).then((doubles) => {
      expect(doubles).to.deep.equal([2, 4, 6, 8, 10]);
    });
  });

  test('Inherited Concast.of static method returns a Concast', () => {
    const concast = Concast.of('asdf', 'qwer', 'zxcv');
    expect(concast).to.be.instanceof(ZenObservable);
    expect(concast).to.be.instanceof(Concast);

    return toArrayPromise(concast).then((values) => {
      expect(values).to.deep.equal(['asdf', 'qwer', 'zxcv']);
    });
  });
});
