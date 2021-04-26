# Async

[![Build Status](https://travis-ci.com/dxos/async.svg?branch=master)](https://travis-ci.com/dxos/async)
[![Coverage Status](https://coveralls.io/repos/github/dxos/async/badge.svg?branch=master)](https://coveralls.io/github/dxos/async?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/dxos/async.svg)](https://greenkeeper.io/)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

## Install

```
$ npm install @dxos/async
```

## Usage

```javascript
import async from '@dxos/async';

const test = async () => {
  const [getValue, setValue] = trigger();
  
  setTimeout(() => {
    setValue(100);
  }, 1000);

  const value = await getValue();
  expect(value).toBe(100);
};
```

## API

```typescript
export function noop(...args: any[]): any[];
export function sleep(timeout: any): Promise<unknown>;
export function timeout(f: any, timeout?: number | undefined): Promise<unknown>;
export function promiseTimeout(promise: Promise<any>, timeout: number): Promise<unknown>;
export function waitForCondition(condFn: Function, timeout?: number | undefined, interval?: number | undefined): any;

export function onEvent(eventEmitter: any, eventName: string, callback: Function): () => any;
export function addListener(eventEmitter: any, eventName: any, callback: any): {
    remove: () => any;
};
export function waitForEvent(eventEmitter: any, eventName: string, test?: Function | undefined, timeout?: number | undefined): Promise<unknown>;

export function expectToThrow(test: Function, errType?: ErrorConstructor): Promise<void>;

export class Event<T> {}

/**
 * Returns a tuple containing a Promise that will be resolved when the resolver function is called.
 */
export function trigger(timeout?: number): [() => Promise<void>, () => void];
export function trigger<T>(timeout?: number): [() => Promise<T>, (arg: T) => void];

/**
 * Use `trigger` instead.
 * @deprecated
 */
export const useValue: typeof trigger;

/**
 * Multiple-use version of `trigger`.
 *
 * Has two states:
 * - WAITING: promise is in pending state and will be resolved once `wake()` is called.
 * - READY: promise is already resolved, and all calls to `wait()` resolve immedeately.
 *
 * Trigger starts in WAITING state initially.
 * Use `reset()` to swith resolved trigger back to WAITING state.
 */
export declare class Trigger {}

/**
 * Returns a callback and a promise that's resolved when the callback is called n times.
 * @param n The number of times the callback is required to be called to resolve the promise.
 */
export declare const latch: (n?: number) => readonly [Promise<number>, () => void];

/**
 * Waits for the specified number of events from the given emitter.
 */
export declare const sink: (emitter: EventEmitter, event: string, count?: number) => Promise<void>;
```

## Contributing

PRs accepted.

## License

GPL-3.0 © DxOS
