//
// Copyright 2023 DXOS.org
//

// Copied from https://github.com/apollographql/apollo-client/tree/1d13de4f19/src/utilities/observables.

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Concast, ConcastSourcesIterable } from './concast';
import { ZenObservable } from './observable';

describe('Concast Observable (similar to Behavior Subject in RxJS)', () => {
  test('can concatenate other observables', () =>
    new Promise<void>((resolve, reject) => {
      const concast = new Concast([
        ZenObservable.of(1, 2, 3),
        Promise.resolve(ZenObservable.of(4, 5)),
        ZenObservable.of(6, 7, 8, 9),
        Promise.resolve().then(() => ZenObservable.of(10)),
        ZenObservable.of(11)
      ]);

      const results: number[] = [];
      concast.subscribe({
        next: (num) => {
          results.push(num);
        },

        error: reject,

        complete: () => {
          concast.promise
            .then((finalResult) => {
              expect(results).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
              expect(finalResult).to.equal(11);
              resolve();
            })
            .catch(reject);
        }
      });
    }));

  test('Can tolerate being completed before input Promise resolves', () =>
    new Promise<void>((resolve, reject) => {
      let resolvePromise: (sources: ConcastSourcesIterable<number>) => void;
      const delayPromise = new Promise<ConcastSourcesIterable<number>>((resolve) => {
        resolvePromise = resolve;
      });

      const concast = new Concast<number>(delayPromise);
      const observer = {
        next: () => {
          reject(new Error('should not have called observer.next'));
        },
        error: reject,
        complete: () => {
          reject(new Error('should not have called observer.complete'));
        }
      };

      concast.addObserver(observer);
      concast.removeObserver(observer);

      return concast.promise
        .then((finalResult) => {
          expect(finalResult).to.be.undefined;
          resolvePromise([]);
          return delayPromise;
        })
        .then((delayedPromiseResult) => {
          expect(delayedPromiseResult).to.deep.equal([]);
          resolve();
        })
        .catch(reject);
    }));

  test('behaves appropriately if unsubscribed before first result', () =>
    new Promise<void>((resolve, reject) => {
      const concast = new Concast([
        new Promise((resolve) => setTimeout(resolve, 100)).then(() => ZenObservable.of(1, 2, 3))
      ]);

      const cleanupCounts = {
        first: 0,
        second: 0
      };

      concast.beforeNext(() => {
        ++cleanupCounts.first;
      });

      const unsubscribe = concast.subscribe({
        next: () => {
          reject(new Error('should not have called observer.next'));
        },
        error: () => {
          reject(new Error('should not have called observer.error'));
        },
        complete: () => {
          reject(new Error('should not have called observer.complete'));
        }
      });

      concast.beforeNext(() => {
        ++cleanupCounts.second;
      });

      // Immediately unsubscribe the observer we just added, triggering
      // completion.
      unsubscribe.unsubscribe();

      return concast.promise
        .then((finalResult) => {
          expect(finalResult).to.be.undefined;
          expect(cleanupCounts).to.deep.equal({
            first: 1,
            second: 1
          });
          resolve();
        })
        .catch(reject);
    }));

  test('concast.beforeNext listeners run before next result/error', () => {
    const log: Array<number | [string, any?]> = [];
    let resolve7Promise: undefined | (() => void);

    const concast = new Concast([
      ZenObservable.of(1, 2),

      new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
        enqueueListener();
        return ZenObservable.of(3, 4);
      }),

      ZenObservable.of(5, 6),

      new Promise<void>((resolve) => {
        resolve7Promise = resolve;
      }).then(() => {
        enqueueListener();
        return ZenObservable.of(7);
      }),

      ZenObservable.of(8, 9)
    ]);

    const enqueueListener = () => {
      concast.beforeNext((method, arg) => {
        log.push([method, arg]);
      });
    };

    const sub = concast.subscribe({
      next: (num) => {
        log.push(num);
        if (num === 6) {
          resolve7Promise!();
        } else if (num === 8) {
          enqueueListener();
          // Prevent delivery of final 9 result.
          sub.unsubscribe();
        }
      }
    });

    enqueueListener();

    return concast.promise.then((lastResult) => {
      expect(lastResult).to.equal(8);

      // eslint-disable-next-line no-void
      expect(log).deep.equal([['next', 1], 1, 2, ['next', 3], 3, 4, 5, 6, ['next', 7], 7, 8, ['complete', void 0]]);

      sub.unsubscribe();
    });
  });
});
