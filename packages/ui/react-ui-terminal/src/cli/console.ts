//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { XtermBridge } from './bridge';

const stringify = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

const format = (args: ReadonlyArray<unknown>): string => args.map(stringify).join(' ');

/**
 * Routes Effect's `Console` to the terminal.
 *
 * `@effect/cli` renders help, usage errors, and wizard output as ANSI text through this service,
 * which xterm interprets natively — so the browser gets the same styled output as a shell.
 */
export const make = (bridge: XtermBridge): Console.Console => {
  const write = (args: ReadonlyArray<unknown>) => bridge.write(format(args) + '\n');

  const unsafe: Console.UnsafeConsole = {
    assert: (condition, ...args) => {
      if (!condition) {
        write(['Assertion failed:', ...args]);
      }
    },
    clear: () => bridge.clear(),
    count: () => {},
    countReset: () => {},
    debug: (...args) => write(args),
    dir: (item) => write([item]),
    dirxml: (...args) => write(args),
    error: (...args) => write(args),
    group: (...args) => write(args),
    groupCollapsed: (...args) => write(args),
    groupEnd: () => {},
    info: (...args) => write(args),
    log: (...args) => write(args),
    table: (tabularData) => write([tabularData]),
    time: () => {},
    timeEnd: () => {},
    timeLog: (_label, ...args) => write(args),
    trace: (...args) => write(args),
    warn: (...args) => write(args),
  };

  return Console.Console.of({
    [Console.TypeId]: Console.TypeId,
    assert: (condition, ...args) => Effect.sync(() => unsafe.assert(condition, ...args)),
    clear: Effect.sync(() => unsafe.clear()),
    count: (label) => Effect.sync(() => unsafe.count(label)),
    countReset: (label) => Effect.sync(() => unsafe.countReset(label)),
    debug: (...args) => Effect.sync(() => unsafe.debug(...args)),
    dir: (item, options) => Effect.sync(() => unsafe.dir(item, options)),
    dirxml: (...args) => Effect.sync(() => unsafe.dirxml(...args)),
    error: (...args) => Effect.sync(() => unsafe.error(...args)),
    group: (options) => Effect.sync(() => unsafe.group(options?.label)),
    groupEnd: Effect.sync(() => unsafe.groupEnd()),
    info: (...args) => Effect.sync(() => unsafe.info(...args)),
    log: (...args) => Effect.sync(() => unsafe.log(...args)),
    table: (tabularData, properties) => Effect.sync(() => unsafe.table(tabularData, properties)),
    time: (label) => Effect.sync(() => unsafe.time(label)),
    timeEnd: (label) => Effect.sync(() => unsafe.timeEnd(label)),
    timeLog: (label, ...args) => Effect.sync(() => unsafe.timeLog(label, ...args)),
    trace: (...args) => Effect.sync(() => unsafe.trace(...args)),
    warn: (...args) => Effect.sync(() => unsafe.warn(...args)),
    unsafe,
  });
};

export const layer = (bridge: XtermBridge): Layer.Layer<Console.Console> =>
  Layer.succeed(Console.Console, make(bridge));
