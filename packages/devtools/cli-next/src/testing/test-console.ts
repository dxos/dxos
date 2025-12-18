//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import * as Console from 'effect/Console';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

function logToString(...args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }

      return inspect(arg, { colors: false, depth: null });
    })
    .join(' ');
}

class TestConsoleService {
  private _logs: Array<{ level: string; args: unknown; message: string }> = [];

  readonly console: Console.Console;

  constructor(console: Console.Console) {
    const pusher =
      (level: string) =>
      (...args: readonly any[]) => {
        this._logs.push({ level, args, message: logToString(...args) });
      };

    this.console = {
      ...console,
      log: (...args: readonly any[]) => Effect.sync(() => pusher('log')(...args)),
    };
  }

  get logs() {
    return [...this._logs];
  }

  clear() {
    this._logs.length = 0;
  }
}

// TODO(burdon): We could have a single namespace "Testing" with all test utilities.
export namespace TestConsole {
  export class TestConsole extends Context.Tag('TestConsole')<TestConsole, TestConsoleService>() {}

  /**
   * Extract JSON string from log arguments.
   * Handles both array and string argument formats.
   */
  export const extractJsonString = (log: { args: unknown }): string => {
    if (Array.isArray(log.args) && log.args.length > 0) {
      return String(log.args[0]);
    }
    return log.args as string;
  };

  /**
   * Parse JSON from log arguments.
   * Handles both array and string argument formats.
   */
  export const parseJson = <T = unknown>(log: { args: unknown }): T => {
    const jsonString = extractJsonString(log);
    return JSON.parse(jsonString) as T;
  };

  const testConsole = Layer.effect(
    TestConsole,
    Effect.gen(function* () {
      return new TestConsoleService(yield* Effect.console);
    }),
  );

  const setConsole = Effect.gen(function* () {
    const { console } = yield* TestConsole;
    return Console.setConsole(console);
  }).pipe(Layer.unwrapEffect);

  export const layer = Layer.provideMerge(setConsole, testConsole);
}
