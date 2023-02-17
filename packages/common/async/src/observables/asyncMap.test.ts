//
// Copyright 2023 DXOS.org./asyncMap
//

// Copied from https://github.com/apollographql/apollo-client/tree/1d13de4f19/src/utilities/observables.

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { asyncMap } from './asyncMap';
import { ZenObservable } from './observable';

const wait = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

const make1234Observable = () =>
  new ZenObservable<number>((observer) => {
    observer.next(1);
    observer.next(2);
    setTimeout(() => {
      observer.next(3);
      setTimeout(() => {
        observer.next(4);
        observer.complete();
      }, 10);
    }, 10);
  });

function rejectExceptions<Args extends any[], Ret>(reject: (reason: any) => any, fn: (...args: Args) => Ret) {
  return function () {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return fn.apply(this, arguments); // eslint-disable-line prefer-rest-params
    } catch (error) {
      reject(error);
    }
  } as typeof fn;
}

describe('asyncMap', () => {
  test('keeps normal results in order', () =>
    new Promise<void>((resolve, reject) => {
      const values: number[] = [];
      const mapped: number[] = [];

      asyncMap(make1234Observable(), (value) => {
        values.push(value);
        // Make earlier results take longer than later results.
        const delay = 100 - value * 10;
        return wait(delay).then(() => value * 2);
      }).subscribe({
        next: (mappedValue) => {
          mapped.push(mappedValue);
        },
        error: reject,
        complete: rejectExceptions(reject, () => {
          expect(values).to.deep.equal([1, 2, 3, 4]);
          expect(mapped).to.deep.equal([2, 4, 6, 8]);
          resolve();
        })
      });
    }));

  test('handles exceptions from mapping functions', () =>
    new Promise<void>((resolve, reject) => {
      const triples: number[] = [];
      asyncMap(make1234Observable(), (num) => {
        if (num === 3) {
          throw new Error('expected');
        }
        return num * 3;
      }).subscribe({
        next: rejectExceptions(reject, (triple) => {
          expect(triple).to.be.lessThan(9);
          triples.push(triple);
        }),
        error: rejectExceptions(reject, (error) => {
          expect(error.message).to.equal('expected');
          expect(triples).to.deep.equal([3, 6]);
          resolve();
        })
      });
    }));

  test('handles rejected promises from mapping functions', () =>
    new Promise<void>((resolve, reject) => {
      const triples: number[] = [];
      asyncMap(make1234Observable(), (num) => {
        if (num === 3) {
          return Promise.reject(new Error('expected'));
        }
        return num * 3;
      }).subscribe({
        next: rejectExceptions(reject, (triple) => {
          expect(triple).to.be.lessThan(9);
          triples.push(triple);
        }),
        error: rejectExceptions(reject, (error) => {
          expect(error.message).to.equal('expected');
          expect(triples).to.deep.equal([3, 6]);
          resolve();
        })
      });
    }));

  test('handles async exceptions from mapping functions', () =>
    new Promise<void>((resolve, reject) => {
      const triples: number[] = [];
      asyncMap(make1234Observable(), (num) =>
        wait(10).then(() => {
          if (num === 3) {
            throw new Error('expected');
          }
          return num * 3;
        })
      ).subscribe({
        next: rejectExceptions(reject, (triple) => {
          expect(triple).to.be.lessThan(9);
          triples.push(triple);
        }),
        error: rejectExceptions(reject, (error) => {
          expect(error.message).to.equal('expected');
          expect(triples).to.deep.equal([3, 6]);
          resolve();
        })
      });
    }));

  test('handles exceptions from next functions', () =>
    new Promise<void>((resolve, reject) => {
      const triples: number[] = [];
      asyncMap(make1234Observable(), (num) => {
        return num * 3;
      }).subscribe({
        next: (triple) => {
          triples.push(triple);
          // Unfortunately this exception won't be caught by asyncMap, because
          // the Observable implementation wraps this next function with its own
          // try-catch. Uncomment the remaining lines to make this test more
          // meaningful, in the event that this behavior ever changes.
          // if (triple === 9) throw new Error("expected");
        },
        // error: rejectExceptions(reject, error => {
        //   expect(error.message).toBe("expected");
        //   expect(triples).toEqual([3, 6, 9]);
        //   resolve();
        // }),
        complete: rejectExceptions(reject, () => {
          expect(triples).to.deep.equal([3, 6, 9, 12]);
          resolve();
        })
      });
    }));
});
