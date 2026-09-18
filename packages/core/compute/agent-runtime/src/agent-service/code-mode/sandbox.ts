//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { OpaqueToolkit } from '@dxos/ai';
import { Database, Filter, Obj, Type } from '@dxos/echo';
import { RuntimeProvider } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

/** The single tool a code-mode agent carries. */
export const EVAL_TOOL_NAME = 'eval';

/** Characters of printed output returned from one eval call before it is truncated. */
const DEFAULT_MAX_OUTPUT = 8_000;

/**
 * An operation the sandbox exposes under `ops`, projected from a skill-bound tool.
 */
export type SandboxOperation = {
  /** Name the sandbox binds it under, i.e. the tool name derived from the operation key. */
  readonly name: string;
  readonly description?: string;
  /** JSON schema of the operation's input, rendered into the model's API reference. */
  readonly parameters: unknown;
  /** Runs the operation, returning its result or the error text the tool reported. */
  readonly invoke: (input: unknown) => Effect.Effect<unknown>;
};

export type EvalToolkitOptions = {
  /** Services the sandbox's ECHO API runs against. */
  readonly runtime: Context.Context<Database.Service>;
  readonly operations: readonly SandboxOperation[];
  readonly maxOutput?: number;
};

export const EvalTool = Tool.make(EVAL_TOOL_NAME, {
  description:
    'Runs JavaScript against the workspace and returns whatever the code printed. ' +
    'This is the only tool: every read, every write and every operation happens inside it.',
  parameters: Schema.Struct({
    code: Schema.String.annotate({
      description:
        'Body of an async function. Use `await`, call `print(...)` for anything you need to see, ' +
        'and do NOT use `import`/`require` — the API is already in scope.',
    }),
  }),
  success: Schema.Struct({
    output: Schema.String,
  }),
  failure: Schema.Never,
});

export const EvalToolkitDefinition = Toolkit.make(EvalTool);

/**
 * The toolkit a code-mode turn hands the model: one `eval` tool whose sandbox closes over the
 * turn's operations. Rebuilt per turn, since a skill enabled mid-request changes what `ops` holds.
 */
export const makeEvalToolkit = ({
  runtime,
  operations,
  maxOutput = DEFAULT_MAX_OUTPUT,
}: EvalToolkitOptions): OpaqueToolkit.OpaqueToolkit => {
  // The services are closed over rather than taken from the handler's context: a handler with
  // requirements makes the toolkit unusable as a turn toolkit, whose layer must be fully satisfied.
  const run = RuntimeProvider.runPromise(Effect.succeed(runtime));
  return OpaqueToolkit.make(
    EvalToolkitDefinition,
    EvalToolkitDefinition.toLayer({
      [EVAL_TOOL_NAME]: Effect.fnUntraced(function* ({ code }: { code: string }) {
        const output = yield* Effect.promise(() => runSandbox({ code, operations, maxOutput, run }));
        return { output };
      }),
    }),
  );
};

/** `AsyncFunction` is not a global binding, so it is reached through an async function's prototype. */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

type RunSandboxOptions = Omit<EvalToolkitOptions, 'runtime'> & {
  readonly code: string;
  readonly maxOutput: number;
  /** Runs an effect against the turn's services, so the sandbox's API can be plain async functions. */
  readonly run: <A>(effect: Effect.Effect<A, any, Database.Service>) => Promise<A>;
};

/**
 * Executes the model's code with the ECHO API in scope and returns what it printed.
 *
 * A throw is reported as output rather than as a tool failure: the model's next move is to read the
 * message and write different code, which a failed turn would deny it.
 */
const runSandbox = async ({ code, operations, maxOutput, run }: RunSandboxOptions): Promise<string> => {
  const lines: string[] = [];
  let printed = 0;
  const print = (...values: unknown[]): void => {
    if (printed >= maxOutput) {
      return;
    }
    const line = values.map(format).join(' ');
    printed += line.length;
    lines.push(
      printed > maxOutput ? `${line.slice(0, line.length - (printed - maxOutput))}\n[output truncated]` : line,
    );
  };

  const api = {
    print,

    /** Objects of `typename`, optionally narrowed by exact property values. */
    query: (typename: string, props?: Record<string, unknown>) =>
      run(Database.query(Filter.type(DXN.make(typename), props)).run),

    /** Creates an unpersisted object of `typename`; pass it to `add` to store it. */
    make: (typename: string, props: Record<string, unknown>) =>
      run(
        Effect.gen(function* () {
          const { db } = yield* Database.Service;
          // Matched on the typename rather than by URI: a registered type is indexed under its
          // VERSIONED DXN, and the model names a type the same way it does in a query — unversioned.
          const type = db.registry
            .list()
            .find((entity) => Type.isType(entity) && Type.getTypename(entity) === typename);
          // Objects only: a relation type needs a source and target `make` has no way to take.
          if (type === undefined || !Type.isType(type) || !Type.isObject(type)) {
            throw new Error(`Unknown object type: ${typename}`);
          }
          return Obj.make(type, props);
        }),
      ),

    add: (obj: Obj.Unknown) => run(Database.add(obj)),
    remove: (obj: Obj.Unknown) => run(Database.remove(obj)),
    flush: () => run(Database.flush()),

    /** Mutates a stored object; every write to an ECHO object goes through this. */
    update: (obj: Obj.Unknown, mutator: (obj: any) => void) => Obj.update(obj, mutator),

    ops: Object.fromEntries(
      operations.flatMap((operation) => {
        const invoke = (input: unknown = {}) => run(operation.invoke(input));
        // Bound under both the tool name and its camelCase form: the derived names are kebab-case,
        // which is not an identifier, so `ops.researchOrg` would otherwise have to be bracketed.
        return [
          [operation.name, invoke],
          [camelCase(operation.name), invoke],
        ];
      }),
    ),
  };

  const names = Object.keys(api);
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new AsyncFunction(...names, `'use strict';\n${code}`);
    const result = await fn(...names.map((name) => api[name as keyof typeof api]));
    if (result !== undefined && lines.length === 0) {
      print(result);
    }
  } catch (err) {
    log.info('code-mode eval failed', { err });
    lines.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return lines.join('\n');
};

const camelCase = (name: string): string => name.replace(/[-_]([a-z0-9])/g, (_, char: string) => char.toUpperCase());

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
