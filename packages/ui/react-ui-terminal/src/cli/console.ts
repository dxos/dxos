//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Layer from 'effect/Layer';

import type { TerminalBridge } from './bridge.ts';

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
 * The CLI renders help, usage errors, and wizard output as ANSI text through this service, which
 * xterm interprets natively — so the browser gets the same styled output as a shell.
 */
export const make = (bridge: TerminalBridge): Console.Console => {
  const write = (args: ReadonlyArray<unknown>) => bridge.write(format(args) + '\n');
  const noop = () => {};

  return {
    assert: (condition, ...args) => {
      if (!condition) {
        write(['Assertion failed:', ...args]);
      }
    },
    clear: () => bridge.clear(),
    count: noop,
    countReset: noop,
    debug: (...args) => write(args),
    dir: (item) => write([item]),
    dirxml: (...args) => write(args),
    error: (...args) => write(args),
    group: (...args) => write(args),
    groupCollapsed: (...args) => write(args),
    groupEnd: noop,
    info: (...args) => write(args),
    log: (...args) => write(args),
    table: (tabularData) => write([tabularData]),
    time: noop,
    timeEnd: noop,
    timeLog: (_label, ...args) => write(args),
    trace: (...args) => write(args),
    warn: (...args) => write(args),
  };
};

/** Overrides the console for everything running under the layer. */
export const layer = (bridge: TerminalBridge): Layer.Layer<never> =>
  Layer.succeedContext(Console.Console.context(make(bridge)));
