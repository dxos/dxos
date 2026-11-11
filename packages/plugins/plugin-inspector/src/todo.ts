//
// Copyright 2026 DXOS.org
//

const MESSAGE = /Not written yet: (.+)\./;

/** Thrown when code reaches a starter placeholder: the step that writes it has not been done. */
export class TodoError extends Error {
  constructor(readonly step: string) {
    super(`Not written yet: ${step}.`);
    this.name = 'TodoError';
  }
}

/**
 * A placeholder for the code that `step` writes. Calling it, constructing it or reading a property of it throws a
 * {@link TodoError} naming the step, so the module that uses it fails with the step in its message.
 */
export function todo(step: string): never;
export function todo(step: string): unknown {
  const fail = (): never => {
    throw new TodoError(step);
  };

  return new Proxy(fail, {
    apply: fail,
    construct: fail,
    // Symbols and `then` are probed by loggers and `await`; neither is the reader's code using the value.
    get: (_, property) => (typeof property === 'symbol' || property === 'then' ? undefined : fail()),
  });
}

/** The step a failure is waiting on, if it came from a placeholder; looks through `cause` chains. */
export const todoStep = (error: unknown): string | undefined => {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current instanceof TodoError) {
      return current.step;
    }
    // A wrapper that copied the message but not the error, e.g. one rethrown across a module boundary.
    const step = current.message.match(MESSAGE)?.[1];
    if (step) {
      return step;
    }
  }
  return undefined;
};
