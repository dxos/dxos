//
// Copyright 2023 DXOS.org
//

import Observable from 'zen-observable';
import type { ObservableLike, Observer, Subscriber, Subscription } from 'zen-observable/esm';
import PushStream from 'zen-push';

import { Event } from './events';

export { Observable, PushStream, Subscriber };

/**
 * Observable which supports multiple subscribers and stores the current value.
 *
 * The current value is emitted to new subscribers on subscription.
 */
// Inspired by:
// https://github.com/zenparsing/zen-push/blob/39949f1/index.js
// https://github.com/apollographql/apollo-client/blob/a0eb4d6/src/utilities/observables/Concast.ts
export class MulticastObservable<T> extends Observable<T> {
  private readonly _observers = new Set<Observer<T>>();
  private readonly _observable: Observable<T>;
  private _subscription: Subscription;

  constructor(subscriber: Observable<T> | Subscriber<T>, private _value?: T) {
    super((observer) => this._subscribe(observer));

    this._observable = typeof subscriber === 'function' ? new Observable(subscriber) : subscriber;
    this._subscription = this._observable.subscribe(this._handlers);
  }

  static override from<T>(value: Observable<T> | ObservableLike<T> | ArrayLike<T> | Event<T>, initialValue?: T) {
    if ('emit' in value) {
      return new MulticastObservable((observer) => {
        // TODO(wittjosiah): Do error/complete matter for events?
        value.on((data) => {
          observer.next(data);
        });
      }, initialValue);
    }

    const observable = super.from(value);
    return new MulticastObservable(observable, initialValue);
  }

  static override of<T>(...items: T[]) {
    return new MulticastObservable(super.of(...items.slice(1)), items[0]);
  }

  /**
   * @returns Stable reference to an observable that always returns `undefined`.
   */
  static empty() {
    return EMPTY_OBSERVABLE;
  }

  /**
   * Get the current value of the observable.
   */
  get(): T {
    // TODO(wittjosiah): Is there a better way to handle this?
    //   `this._value` is not guaranteed to be set for compatibility with `Observable` base class.
    //   `get()` should always return `T` to avoid having to sprinkle conditional logic.
    if (this._value === undefined) {
      throw new Error('MulticastObservable is not initialized.');
    }

    return this._value;
  }

  private _subscribe(observer: Observer<T>) {
    if (this._subscription.closed) {
      this._subscription = this._observable.subscribe(this._handlers);
    }

    if (!this._observers.has(observer) && this._value !== undefined) {
      observer.next?.(this._value);
      this._observers.add(observer);
    }

    return () => {
      this._observers.delete(observer);

      if (this._observers.size === 0) {
        this._subscription.unsubscribe();
      }
    };
  }

  private _handlers: Observer<T> = {
    next: (value) => {
      this._value = value;
      this._observers.forEach((observer) => observer.next?.(value));
    },
    error: (err) => {
      this._observers.forEach((observer) => observer.error?.(err));
    },
    complete: () => {
      this._observers.forEach((observer) => observer.complete?.());
    }
  };
}

const EMPTY_OBSERVABLE = MulticastObservable.of(null);
