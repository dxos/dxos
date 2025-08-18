//
// Copyright 2025 DXOS.org
//

import util from 'util';

import { Console, Context, Effect, Layer } from 'effect';

function logToString(...args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg; // console.log prints raw strings, no quotes
      }

      return util.inspect(arg, { colors: false, depth: null });
    })
    .join(' ');
}

export class TestConsoleImpl {
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

export class TestConsole extends Context.Tag('TestConsole')<TestConsole, TestConsoleImpl>() {}

export const testConsole: Layer.Layer<TestConsole, never, Console.Console> = Layer.effect(
  TestConsole,
  Effect.gen(function* () {
    return new TestConsoleImpl(yield* Effect.console);
  }),
);

export const withTestConsole: Layer.Layer<never, never, TestConsole> = Effect.gen(function* () {
  const { console } = yield* TestConsole;
  return Console.setConsole(console);
}).pipe(Layer.unwrapEffect);

export const TestConsoleLayer: Layer.Layer<TestConsole, never, Console.Console> = Layer.mergeAll(
  //
  testConsole,
  withTestConsole,
);
