//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { OpaqueToolkit } from '@dxos/ai';
import type { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import type { Dialect, Operation } from './Dialect.ts';
import * as Sandbox from './Sandbox.ts';

/** The single tool a code-mode agent carries. */
export const EVAL_TOOL_NAME = 'eval';

/** Characters of printed output returned from one eval call before it is truncated. */
const DEFAULT_MAX_OUTPUT = 8_000;

export const EvalTool = Tool.make(EVAL_TOOL_NAME, {
  description:
    'Runs code against the workspace and returns whatever that code printed. ' +
    'This is the only tool: every read, every write and every operation happens inside it.',
  parameters: Schema.Struct({
    code: Schema.String.annotate({
      description: 'The program, in the dialect the system prompt describes. Print anything you need to see.',
    }),
  }),
  success: Schema.Struct({
    output: Schema.String,
  }),
  failure: Schema.Never,
});

export const EvalToolkitDefinition = Toolkit.make(EvalTool);

export type EvalToolkitOptions = {
  readonly dialect: Dialect;
  readonly sandbox: Sandbox.Sandbox;
  /** Services the sandbox's ECHO access runs against. */
  readonly runtime: Context.Context<Database.Service>;
  readonly operations: readonly Operation[];
  readonly maxOutput?: number;
  readonly timeout?: Duration.Input;
};

/**
 * The toolkit a code-mode turn hands the model: one `eval` tool over the turn's dialect and
 * sandbox. Rebuilt per turn, since a skill enabled mid-request changes what the operations are.
 */
export const makeEvalToolkit = ({
  dialect,
  sandbox,
  runtime,
  operations,
  maxOutput = DEFAULT_MAX_OUTPUT,
  timeout,
}: EvalToolkitOptions): OpaqueToolkit.OpaqueToolkit =>
  OpaqueToolkit.make(
    EvalToolkitDefinition,
    EvalToolkitDefinition.toLayer({
      [EVAL_TOOL_NAME]: Effect.fnUntraced(function* ({ code }: { code: string }) {
        const printer = makePrinter(maxOutput);
        const result = yield* sandbox
          .evaluate({
            code: dialect.wrap(code),
            bindings: dialect.bindings({ runtime, operations, print: printer.print }),
            timeout,
          })
          .pipe(Effect.result);

        if (Result.isFailure(result)) {
          // Reported as output, not as a tool failure: the model's next move is to read the message
          // and write different code, which a failed turn would deny it.
          log.info('code-mode evaluation failed', { dialect: dialect.name, message: result.failure.message });
          printer.print(`Error: ${result.failure.message}`);
        } else if (result.success !== undefined && printer.isEmpty()) {
          // A program that printed nothing but produced a value: show the value rather than nothing.
          printer.print(result.success);
        }

        return { output: printer.output() };
      }),
    }),
  );

/** Collects the lines the model's code printed, truncating once the budget is spent. */
const makePrinter = (maxOutput: number) => {
  const lines: string[] = [];
  let printed = 0;
  return {
    print: (...values: unknown[]): void => {
      if (printed >= maxOutput) {
        return;
      }
      const line = values.map(format).join(' ');
      printed += line.length;
      lines.push(
        printed > maxOutput ? `${line.slice(0, line.length - (printed - maxOutput))}\n[output truncated]` : line,
      );
    },
    isEmpty: () => lines.length === 0,
    output: () => lines.join('\n'),
  };
};

/** Printed form of a value: strings verbatim, everything else as JSON the model can read back. */
const format = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};
