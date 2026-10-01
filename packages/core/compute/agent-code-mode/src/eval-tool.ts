//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import type * as Context from 'effect/Context';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import type * as Operation from '@dxos/compute/Operation';
import type { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import type { Dialect, SandboxOperation } from './Dialect.ts';
import * as Sandbox from './Sandbox.ts';

/** The single tool a code-mode agent carries. */
export const EVAL_TOOL_NAME = 'eval';

/** Characters of printed output returned from one eval call before it is truncated. */
export const DEFAULT_MAX_OUTPUT = 8_000;

/** Characters of a failure's message the model is shown; the head says what went wrong. */
const MAX_ERROR_LENGTH = 1_000;

/** Longer than this, one line of a failure is a serialized value (a schema, an AST), not prose. */
const MAX_ERROR_LINE_LENGTH = 300;

/** The one tool a code-mode turn carries: everything the model does, it does by writing code for this. */
export const EvalTool = Tool.make(EVAL_TOOL_NAME, {
  description:
    'Runs code against the workspace and returns whatever that code printed. ' +
    'This is the only tool: every read, every write and every operation happens inside it. ' +
    `Printed output is capped (at ${DEFAULT_MAX_OUTPUT} characters by default) and cut off beyond that, ` +
    'so print the values you need rather than whole objects or long lists.',
  parameters: Schema.Struct({
    code: Schema.String.annotate({
      description: 'The program, in the dialect the system prompt describes. Print anything you need to see.',
    }),
  }),
  success: Schema.Struct({
    output: Schema.String,
    /** False when the code failed; the failure is the last line of `output`. */
    ok: Schema.Boolean,
  }),
  failure: Schema.Never,
});

/** The toolkit shape, separate from the handler so callers can describe the turn without building one. */
export const EvalToolkitDefinition = Toolkit.make(EvalTool);

/** What binds a toolkit to a conversation: the dialect and sandbox to run in, and the turn's output budget. */
export type EvalToolkitOptions = {
  readonly dialect: Dialect;
  readonly sandbox: Sandbox.Sandbox;
  /** Services the sandbox's code runs against — the database, and `Operation.invoke`'s handler. */
  readonly runtime: Context.Context<Database.Service | Operation.Service>;
  readonly operations: readonly SandboxOperation[];
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
            dialect,
            context: { runtime, operations, print: printer.print },
            timeout,
          })
          .pipe(Effect.result);

        if (Result.isFailure(result)) {
          // Reported as output, not as a tool failure: the model's next move is to read the message
          // and write different code, which a failed turn would deny it.
          log.info('code-mode evaluation failed', { dialect: dialect.name, message: result.failure.message });
          printer.fail(`Error: ${conciseError(result.failure.message)}${hintFor(result.failure.message)}`);
        } else if (result.success !== undefined && printer.isEmpty()) {
          // A program that printed nothing but produced a value: show the value rather than nothing.
          printer.print(result.success);
        }

        return { output: printer.output(), ok: Result.isSuccess(result) };
      }),
    }),
  );

/** Collects the lines the model's code printed, truncating once the budget is spent. */
const makePrinter = (maxOutput: number) => {
  const lines: string[] = [];
  let printed = 0;
  let truncated = false;
  return {
    print: (...values: unknown[]): void => {
      if (truncated) {
        return;
      }
      const line = values.map(format).join(' ');
      // The joining newline counts against the budget: a loop printing nothing at all is all
      // separators, which would otherwise grow the buffer without ever spending it.
      const separator = lines.length > 0 ? 1 : 0;
      if (printed + separator + line.length > maxOutput) {
        lines.push(`${line.slice(0, Math.max(0, maxOutput - printed - separator))}\n${truncationWarning(maxOutput)}`);
        truncated = true;
        return;
      }
      printed += separator + line.length;
      lines.push(line);
    },
    /** Past the budget too: a failure the model is not shown reads as code that worked. */
    fail: (message: string): void => {
      lines.push(message);
    },
    isEmpty: () => lines.length === 0,
    output: () => lines.join('\n'),
  };
};

/** Tells the model its output was cut, and how to get what it needs within the cap next time. */
const truncationWarning = (maxOutput: number): string =>
  `[output truncated: an eval result is capped at ${maxOutput} characters and the rest was dropped. ` +
  'Print less — counts, the specific fields you need, or a slice — and run again if you need more.]';

/**
 * A pointer past an error whose own message does not say what went wrong. `yield*` on something that
 * is not an effect reads as `(intermediate value) is not iterable`, and is most often a ref loaded as
 * `yield* ref.load` or through a helper that does not exist.
 */
const hintFor = (message: string): string =>
  /is not iterable/.test(message)
    ? '\nHint: `yield*` takes an Effect, and that value is not one. Load a ref with `yield* Database.load(ref)`.'
    : '';

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

/**
 * A failure's message cut to what the model can act on.
 *
 * A schema validation error carries its cause chain, and the innermost cause serializes the whole
 * schema — several kilobytes that spend the output budget and the context window while the first
 * line has already named the field that failed.
 */
export const conciseError = (message: string): string => {
  const text = message
    .split('\n')
    .map((line) =>
      line.length > MAX_ERROR_LINE_LENGTH
        ? `${line.slice(0, MAX_ERROR_LINE_LENGTH)}… [${line.length - MAX_ERROR_LINE_LENGTH} characters omitted]`
        : line,
    )
    .join('\n');
  return text.length > MAX_ERROR_LENGTH ? `${text.slice(0, MAX_ERROR_LENGTH)}… [error truncated]` : text;
};
