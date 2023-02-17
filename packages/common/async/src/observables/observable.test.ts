//
// Copyright 2023 DXOS.org
//

// Copied from https://github.com/apollographql/apollo-client/tree/1d13de4f19/src/utilities/observables.

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ZenObservable, Subscriber } from './observable';

describe('Observable', () => {
  describe('subclassing by non-class constructor functions', () => {
    const check = (constructor: new <T>(sub: Subscriber<T>) => ZenObservable<T>) => {
      constructor.prototype = Object.create(ZenObservable.prototype, {
        constructor: {
          value: constructor
        }
      });

      const subscriber: Subscriber<number> = (observer) => {
        observer.next(123);
        observer.complete();
      };

      const obs = new constructor(subscriber) as ZenObservable<number>;

      expect(typeof (obs as any).sub).to.equal('function');
      expect((obs as any).sub).to.equal(subscriber);

      expect(obs).to.be.instanceof(ZenObservable);
      expect(obs).to.be.instanceof(constructor);
      expect(obs.constructor).to.equal(constructor);

      return new Promise((resolve, reject) => {
        obs.subscribe({
          next: resolve,
          error: reject
        });
      }).then((value) => {
        expect(value).to.equal(123);
      });
    };

    const newify = (constructor: <T>(sub: Subscriber<T>) => void): new <T>(sub: Subscriber<T>) => ZenObservable<T> =>
      constructor as any;

    /* eslint-disable @typescript-eslint/ban-ts-comment */
    test('simulating super(sub) with Observable.call(this, sub)', () => {
      function SubclassWithSuperCall<T>(sub: Subscriber<T>) {
        // @ts-ignore
        const self = ZenObservable.call(this, sub) || this;
        self.sub = sub;
        return self;
      }
      return check(newify(SubclassWithSuperCall));
    });

    test('simulating super(sub) with Observable.apply(this, arguments)', () => {
      function SubclassWithSuperApplyArgs<T>(_sub: Subscriber<T>) {
        // @ts-ignore
        const self = ZenObservable.apply(this, arguments) || this; // eslint-disable-line prefer-rest-params
        self.sub = _sub;
        return self;
      }
      return check(newify(SubclassWithSuperApplyArgs));
    });

    test('simulating super(sub) with Observable.apply(this, [sub])', () => {
      function SubclassWithSuperApplyArray<T>(...args: [Subscriber<T>]) {
        // @ts-ignore
        const self = ZenObservable.apply(this, args) || this;
        self.sub = args[0];
        return self;
      }
      return check(newify(SubclassWithSuperApplyArray));
    });
    /* eslint-enable @typescript-eslint/ban-ts-comment */
  });
});
