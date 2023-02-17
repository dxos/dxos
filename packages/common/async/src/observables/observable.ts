//
// Copyright 2023 DXOS.org
//

// Copied from https://github.com/apollographql/apollo-client/tree/1d13de4f19/src/utilities/observables.

import {
  Observable as ZenObservable,
  Observer,
  Subscription as ObservableSubscription,
  Subscriber
} from 'zen-observable-ts';

// This simplified polyfill attempts to follow the ECMAScript Observable
// proposal (https://github.com/zenparsing/es-observable)
import 'symbol-observable';

export type { Observer, ObservableSubscription, Subscriber };

// The zen-observable package defines Observable.prototype[Symbol.observable]
// when Symbol is supported, but RxJS interop depends on also setting this fake
// '@@observable' string as a polyfill for Symbol.observable.
const { prototype } = ZenObservable;
const fakeObsSymbol = '@@observable' as keyof typeof prototype;
if (!prototype[fakeObsSymbol]) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prototype[fakeObsSymbol] = function () {
    return this;
  };
}

export { ZenObservable };
