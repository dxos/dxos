//
// Copyright 2026 DXOS.org
//

/**
 * `node:util` as the guest's libraries use it: `inspect.custom` to tag their objects for printing,
 * the rest at module scope only. The VM has no console worth inspecting for.
 */

const custom = Symbol.for('nodejs.util.inspect.custom');

const render = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

export const inspect = Object.assign(render, { custom, defaultOptions: {} });

export const format = (...args: unknown[]): string => args.map(render).join(' ');

export const promisify =
  (fn: (...args: any[]) => void) =>
  (...args: unknown[]): Promise<unknown> =>
    new Promise((resolve, reject) =>
      fn(...args, (error: unknown, value: unknown) => (error ? reject(error) : resolve(value))),
    );

export const callbackify =
  (fn: (...args: unknown[]) => Promise<unknown>) =>
  (...args: unknown[]): void => {
    const callback = args.pop();
    if (typeof callback === 'function') {
      fn(...args).then(
        (value) => callback(null, value),
        (error) => callback(error),
      );
    }
  };

export const parseArgs = (): never => {
  throw new Error('parseArgs is not available in the sandbox.');
};

export default { inspect, format, promisify, callbackify, parseArgs };
