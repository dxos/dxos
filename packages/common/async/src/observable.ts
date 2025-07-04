//
// Copyright 2023 DXOS.org
//

import Observable from 'zen-observable';
import type { ObservableLike, Observer, Subscriber } from 'zen-observable/esm';
import PushStream from 'zen-push';

import { type Event } from './events';
import { Trigger } from './trigger';

export { Observable, PushStream, type Subscriber };

// Inspired by:
// https://github.com/zenparsing/zen-push/blob/39949f1/index.js#L93
// https://github.com/apollographql/apollo-client/blob/a0eb4d6/src/utilities/observables/Concast.ts

/**
 * Observable which supports multiple subscribers and stores the current value.
 *
 * The current value is emitted to new subscribers on subscription.
 */
export class MulticastObservable<T> extends Observable<T> {
  private readonly _observers = new Set<Observer<T>>();
  private readonly _observable: Observable<T>;
  private readonly _completed = new Trigger();

  constructor(
    subscriber: Observable<T> | Subscriber<T>,
    protected _value?: T,
  ) {
    super((observer) => this._subscribe(observer));

    this._observable = typeof subscriber === 'function' ? new Observable(subscriber) : subscriber;
    // Automatically subscribe to source observable.
    // Ensures that the current value is always up to date.
    // TODO(wittjosiah): Does this subscription need to be cleaned up? Where should that happen?
    this._observable.subscribe(this._handlers);
  }

  static override from<T>(
    value: Observable<T> | ObservableLike<T> | ArrayLike<T> | Event<T>,
    initialValue?: T,
  ): MulticastObservable<T> {
    if ('emit' in value) {
      return new MulticastObservable((observer) => {
        // TODO(wittjosiah): Do error/complete matter for events?
        value.on((data) => {
          observer.next(data);
        });
      }, initialValue);
    }

    const observable = Observable.from(value);
    return new MulticastObservable(observable, initialValue);
  }

  static override of<T>(...items: T[]): MulticastObservable<T> {
    return new MulticastObservable(Observable.of(...items.slice(1)), items[0]);
  }

  /**
   * @returns Stable reference to an observable that always returns `undefined`.
   */
  static empty(): MulticastObservable<null> {
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

  /**
   * Wait for the observable to complete.
   *
   * @returns Promise that resolves to the value of the observable at the time of completion.
   */
  async wait({ timeout }: { timeout?: number } = {}): Promise<T> {
    await this._completed.wait({ timeout });
    return this.get();
  }

  override forEach(callback: (value: T) => void): Promise<void> {
    return this._observable.forEach(callback);
  }

  override map<R>(callback: (value: T) => R): MulticastObservable<R> {
    return new MulticastObservable(this._observable.map(callback), this._value && callback(this._value));
  }

  override filter(callback: (value: T) => boolean): MulticastObservable<T> {
    return new MulticastObservable(
      this._observable.filter(callback),
      this._value && callback(this._value) ? this._value : undefined,
    );
  }

  override reduce<R = T>(callback: (previousValue: R, currentValue: T) => R, initialValue?: R): MulticastObservable<R> {
    return new MulticastObservable(
      initialValue ? this._observable.reduce(callback, initialValue) : this._observable.reduce(callback),
      initialValue ?? (this._value as R),
    );
  }

  override flatMap<R>(callback: (value: T) => MulticastObservable<R>): MulticastObservable<R> {
    return new MulticastObservable(this._observable.flatMap(callback), this._value && callback(this._value).get());
  }

  override concat<R>(...observables: Array<Observable<R>>): MulticastObservable<R> {
    return new MulticastObservable(this._observable.concat(...observables), this._value as R);
  }

  /**
   * Concatenates multicast observables without losing the current value.
   * @param reducer reduces the values of any multicast observables being concatenated into a single value
   * @param observables observables to concatenate
   * @returns concatenated observable
   */
  losslessConcat<R>(
    reducer: (currentValue: R, newValues: R[]) => R,
    ...observables: Array<Observable<R>>
  ): MulticastObservable<R> {
    const multicast = observables.filter(
      (observable): observable is MulticastObservable<R> => observable instanceof MulticastObservable,
    );
    const value = reducer(
      this._value as R,
      multicast.map((observable) => observable.get()),
    );
    return new MulticastObservable(this._observable.concat(...observables), value);
  }

  private _subscribe(observer: Observer<T>): () => void {
    if (!this._observers.has(observer)) {
      this._observers.add(observer);
    }

    if (this._value !== undefined) {
      observer.next?.(this._value);
    }

    return () => {
      this._observers.delete(observer);
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
      this._completed.wake();
      this._observers.forEach((observer) => observer.complete?.());
    },
  };
}

const EMPTY_OBSERVABLE = MulticastObservable.of(null);
