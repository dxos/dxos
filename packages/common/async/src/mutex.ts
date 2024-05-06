//
// Copyright 2020 DXOS.org
//

// Import explicit resource management polyfill.
import '@dxos/util';
import { cancelWithContext, type Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';

/**
 * A locking mechanism to ensure that a given section of the code is executed by only one single "thread" at a time.
 *
 * Functions are chained in a structure similar to a linked list.
 * `_lastPromise` always contains the function that will finish executing last.
 *
 * Initially it is set to `Promise.resolve()` -- a promise that resolves immediately.
 * Enqueuing is done by attaching provided function to the `_lastPromise` via a `.then()` call
 * then updating the `_lastPromise` variable.
 *
 * It is important that enqueuing is done atomically:
 * there are no `await`s in `executeSynchronized` and it's not async while still returning a promise.
 *
 * Java docs reference on synchronized sections:
 * https://docs.oracle.com/javase/tutorial/essential/concurrency/locksync.html
 */
export class Mutex {
  private _queue = Promise.resolve();
  private _queueLength = 0;

  private _tag: string | null = null;

  get tag() {
    return this._tag;
  }

  isLocked(): boolean {
    return this._queueLength > 0;
  }

  /**
   * Acquires the lock.
   * Caller is responsible for releasing the lock using the returned callback.
   * NOTE: Using `executeSynchronized` is preferred over using `acquire` directly.
   * @returns Release callback
   */
  async acquire(tag?: string): Promise<MutexGuard> {
    const prev = this._queue;

    // Immediately update the promise before invoking any async actions so that next invocation waits for our task to complete.
    let guard!: MutexGuard;
    this._queueLength++;
    this._queue = new Promise((resolve) => {
      guard = new MutexGuard(() => {
        this._queueLength--;
        this._tag = null;
        resolve();
      });
    });

    await prev;

    if (tag !== undefined) {
      this._tag = tag;
    }
    return guard;
  }

  /**
   * Waits for all previous executions to complete and then executes a given function.
   * Only a single function can be executed at a time.
   * Function are executed in the same order as `executeSynchronized` is called.
   * WARNING: Calling `executeSynchronized` inside of `executeSynchronized` on the same lock instance is a deadlock.
   */
  async executeSynchronized<T>(fun: () => Promise<T>): Promise<T> {
    const guard = await this.acquire();

    try {
      return await fun();
    } finally {
      guard.release();
    }
  }
}

export class MutexGuard {
  constructor(private readonly _release: () => void) {}

  /**
   * Releases the lock.
   */
  release(): void {
    this._release();
  }

  [Symbol.dispose](): void {
    this.release();
  }
}

const classMutexSymbol = Symbol('class-mutex');

interface LockableClass {
  [classMutexSymbol]?: Mutex;
}

const FORCE_DISABLE_WARNING = false;

// Enabled only in tests by default.
const enableWarning = !FORCE_DISABLE_WARNING && (globalThis as any).mochaExecutor;

/**
 * Same as `synchronized` in Java.
 * Uses a lock global to the current class instance.
 * This way every synchronized method on the same instance will share a single lock.
 */
export const synchronized = (
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<(...args: any) => any>,
) => {
  const method = descriptor.value!;
  descriptor.value = async function synchronizedMethod(this: any & LockableClass, ...args: any) {
    const mutex: Mutex = (this[classMutexSymbol] ??= new Mutex());

    const tag = `${target.constructor.name}.${propertyName}`;

    // Disable warning in prod to avoid performance penalty.
    let guard;
    if (!enableWarning) {
      guard = await mutex.acquire(tag);
    } else {
      guard = await warnAfterTimeout(10_000, `lock on ${tag} (taken by ${mutex.tag})`, () => mutex.acquire(tag));
    }

    try {
      return await method.apply(this, args);
    } finally {
      guard.release();
    }
  };
  Object.defineProperty(descriptor.value, 'name', { value: propertyName + '$synchronized' });
};

export const acquireInContext = async (
  ctx: Context,
  mutex: Mutex,
  options: { releaseOnDispose: boolean } = { releaseOnDispose: true },
): Promise<MutexGuard> => {
  let guard: MutexGuard | undefined;
  try {
    return await cancelWithContext(
      ctx,
      (async () => {
        guard = await mutex.acquire();
        if (ctx.disposed) {
          guard.release();
          guard = undefined;
          throw new Error('Guard released because acquired after context was disposed.');
        }
        if (options.releaseOnDispose) {
          ctx.onDispose(() => guard?.release());
        }
        return guard;
      })(),
    );
  } catch (e) {
    guard?.release();
    throw e;
  }
};
