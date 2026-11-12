//
// Copyright 2026 DXOS.org
//

/** A step the reader has not written yet, the file it goes in, and its place in the learning path. */
export type Todo = {
  readonly step: string;
  readonly file: string;
  readonly order: number;
};

export class TodoError extends Error {
  constructor(readonly todo: Todo) {
    super(`Write ${todo.step}, in ${todo.file}.`);
    this.name = 'TodoError';
  }
}

const listeners = new Set<(todo?: Todo) => void>();
let first: Todo | undefined;

/**
 * Calls `listener` with the earliest unwritten step the app has reached, now
 * and each time that changes; returns a function that stops it.
 */
export const onTodo = (listener: (todo?: Todo) => void) => {
  listeners.add(listener);
  listener(first);
  return () => {
    listeners.delete(listener);
  };
};

const reach = (todo: Todo): never => {
  if (!first || todo.order < first.order) {
    first = todo;
    // A stand-in can throw while React renders, which must not set state then.
    queueMicrotask(() => listeners.forEach((listener) => listener(first)));
  }
  throw new TodoError(todo);
};

/** Keys that tools, such as React's dev build, read from any value without using it. */
const INSPECTED = new Set<PropertyKey>([
  '$$typeof',
  'length',
  'name',
  'prototype',
  'then',
  'toJSON',
]);

/** Whether `key` is one a tool reads to look at a value, not one the app uses. */
const inspected = (key: PropertyKey) =>
  typeof key === 'symbol'
    ? key !== Symbol.iterator && key !== Symbol.asyncIterator
    : // Polyfills such as core-js tag functions under keys like `Symbol(src)_1`.
      INSPECTED.has(key) || /^(Symbol\(|@@|__)/.test(String(key));

/**
 * Stands in for the code `step` writes in `file`: calling it, reading from it
 * or iterating it throws, and tells the app which step to write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the stand-in takes the place of any value.
export const todo = (step: string, file: string, order: number): any => {
  const missing = { step, file, order };
  return new Proxy(() => {}, {
    apply: () => reach(missing),
    construct: () => reach(missing),
    get: (_, key) => (inspected(key) ? undefined : reach(missing)),
    has: () => false,
  });
};
