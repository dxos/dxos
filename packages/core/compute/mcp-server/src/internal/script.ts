//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { type ToolFailure } from './failure.ts';
import * as isolateInternal from './script-isolate.ts';

/** One call a script made to its host: the verb, and the arguments exactly as the script passed them. */
export const ScriptCall = Schema.Struct({
  binding: Schema.Literals(['invoke', 'queryOperations', 'loadSkill']),
  args: Schema.Array(Schema.Unknown),
});
export type ScriptCall = Schema.Schema.Type<typeof ScriptCall>;

/** A {@link ScriptCall}'s answer as it crosses back into an isolate: the value, or the tool failure. */
export type ScriptOutcome =
  | { readonly _tag: 'Ok'; readonly value: unknown }
  | { readonly _tag: 'Failure'; readonly code: ToolFailure['code']; readonly message: string };

/** Answers one call the program makes, through the same governance as the tools. */
export type ScriptDispatch = (call: ScriptCall) => Effect.Effect<unknown, ToolFailure>;

export type ScriptRequest = {
  /** The body of an `Effect.gen` generator. */
  readonly code: string;
  /** The `runScript` call's space, which `spaceId` in the program names. */
  readonly spaceId?: string;
  /** Skill tokens the caller already holds; the program's `invoke` presents them for it. */
  readonly skillTokens: readonly string[];
  readonly timeout: Duration.Duration;
  readonly maxOutput: number;
};

/** What the program printed, and why it failed when it did. */
export type ScriptResult = { readonly output: string; readonly error?: string };

/**
 * Runs one script. `dispatch` answers its calls in this process; a sandbox in another runtime routes
 * them back to its host instead, which answers them with the same governance (`scriptCallOutcome`).
 */
export type Sandbox = {
  readonly run: (request: ScriptRequest, dispatch: ScriptDispatch) => Effect.Effect<ScriptResult>;
};

/** `AsyncFunction` is not a global binding, so it is reached through an async function's prototype. */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * Evaluates in this process via `new AsyncFunction`.
 *
 * NOT A SECURITY BOUNDARY: the code shares the host realm and reaches every global it has, so it is
 * only fit for a host whose caller already holds the host's authority (a local stdio server). The
 * timeout abandons the evaluation rather than stopping it, since nothing in-process can cancel it.
 */
export const inProcess: Sandbox = {
  run: ({ code, spaceId, skillTokens, timeout, maxOutput }, dispatch) =>
    Effect.gen(function* () {
      const services = yield* Effect.context<never>();
      const printer = makePrinter(maxOutput);
      const tokens = new Set(skillTokens);
      const bindings = {
        Effect,
        spaceId,
        print: (...values: unknown[]) => Effect.sync(() => printer.print(...values)),
        invoke: (key: unknown, input?: unknown, options?: unknown) =>
          dispatch({ binding: 'invoke', args: [key, input, withSkillTokens(options, tokens)] }),
        queryOperations: (...args: unknown[]) => dispatch({ binding: 'queryOperations', args }),
        loadSkill: (...args: unknown[]) =>
          dispatch({ binding: 'loadSkill', args }).pipe(Effect.tap((listing) => recordSkillToken(listing, tokens))),
        /** Supplied by the wrapper, not by the script: runs its program and reports how it failed. */
        runEffect: (program: unknown): Promise<unknown> =>
          isProgram(program)
            ? Effect.runPromiseWith(services)(Effect.exit(program)).then((exit) =>
                Exit.isSuccess(exit)
                  ? exit.value
                  : Promise.reject(new Error(describeFailure(Cause.squash(exit.cause)))),
              )
            : Promise.reject(
                new Error(
                  `The script produced a ${typeof program}, not an Effect: write the Effect.gen body only, not the wrapper.`,
                ),
              ),
      };

      const result = yield* Effect.tryPromise({
        try: () => evaluate(wrap(code), bindings, timeout),
        catch: describeFailure,
      }).pipe(Effect.result);
      if (result._tag === 'Failure') {
        return { output: printer.output(), error: result.failure };
      }
      // A program that printed nothing but returned a value would otherwise answer with nothing.
      if (result.success !== undefined && printer.isEmpty()) {
        printer.print(result.success);
      }
      return { output: printer.output() };
    }),
};

/**
 * A sandbox over a runtime that takes a whole module, such as a Worker Loader isolate. `evaluate`
 * runs {@link isolateInternal.module}'s output and returns what its `fetch` answered; a failure to run
 * it at all is reported as the script's error, since the caller can do nothing but retry.
 */
export const isolate = ({
  evaluate,
}: {
  readonly evaluate: (params: {
    readonly mainModule: string;
    readonly timeout: Duration.Duration;
    /** The `runScript` call's space: the host answering the isolate needs it as the calls' default. */
    readonly spaceId?: string;
  }) => Effect.Effect<ScriptResult, { readonly message: string }>;
}): Sandbox => ({
  run: ({ code, spaceId, skillTokens, timeout, maxOutput }) =>
    evaluate({ mainModule: isolateInternal.module({ code, spaceId, skillTokens, maxOutput }), timeout, spaceId }).pipe(
      Effect.catch((error) => Effect.succeed({ output: '', error: `The script could not run: ${error.message}` })),
    ),
});

/**
 * The script's `invoke` options with the tokens it holds attached. The isolate module does the same
 * in its own source (`script-isolate.ts`), so a change here belongs there too.
 */
const withSkillTokens = (options: unknown, tokens: ReadonlySet<string>): unknown =>
  options !== null && typeof options === 'object' && !Array.isArray(options)
    ? { ...options, skillTokens: [...tokens] }
    : { skillTokens: [...tokens] };

/** Keeps the token a `loadSkill` result carries, so later `invoke`s in the script present it. */
const recordSkillToken = (listing: unknown, tokens: Set<string>): Effect.Effect<void> =>
  Effect.sync(() => {
    if (listing !== null && typeof listing === 'object' && 'skillToken' in listing) {
      const { skillToken } = listing;
      if (typeof skillToken === 'string') {
        tokens.add(skillToken);
      }
    }
  });

/**
 * Wraps a script body into the async function body the sandbox evaluates: the script is the body
 * of an `Effect.gen`, so `yield*` works without the model having to remember the wrapper.
 */
const wrap = (code: string): string => `return await runEffect(Effect.gen(function* () {\n${code}\n}));`;

/**
 * Whether a value the script produced is a program `runEffect` can run. Narrowed to no requirements
 * because every binding in scope is already closed over its services, so nothing the script can
 * build needs one.
 */
const isProgram = (value: unknown): value is Effect.Effect<unknown, unknown> => Effect.isEffect(value);

const evaluate = (body: string, bindings: Record<string, unknown>, timeout: Duration.Duration): Promise<unknown> => {
  const names = Object.keys(bindings);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new AsyncFunction(...names, `'use strict';\n${body}`);
  const evaluation: Promise<unknown> = fn(...names.map((name) => bindings[name]));
  // Raced rather than interrupted: an uninterruptible `tryPromise` would hang `Effect.timeout` for as
  // long as the evaluation it was meant to bound.
  const deadline = rejectAfter(timeout);
  return Promise.race([evaluation, deadline.promise]).finally(deadline.cancel);
};

const rejectAfter = (duration: Duration.Duration): { promise: Promise<never>; cancel: () => void } => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`Script did not finish within ${Duration.format(duration)}; it was abandoned.`)),
      Duration.toMillis(duration),
    );
    // A deadline must never be the reason a host with nothing else pending stays alive.
    handle.unref?.();
  });
  return { promise, cancel: () => clearTimeout(handle) };
};

/** What the caller is told a failure was; a tagged error's detail lives in its fields, not `message`. */
const describeFailure = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : [String(error), fields(error)].filter(Boolean).join(' ');
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : (fields(error) ?? 'Unknown failure.');
};

const fields = (error: unknown): string | undefined => {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }
  try {
    const own = { ...error };
    return Object.keys(own).length > 0 ? JSON.stringify(own) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Collects the lines a script printed, truncating once the budget is spent. The isolate module
 * carries the same logic as source (`script-isolate.ts`), so a change here belongs there too.
 */
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
      // The joining newline counts, or a loop printing empty lines would grow the buffer for free.
      const separator = lines.length > 0 ? 1 : 0;
      if (printed + separator + line.length > maxOutput) {
        lines.push(`${line.slice(0, Math.max(0, maxOutput - printed - separator))}\n[output truncated]`);
        truncated = true;
        return;
      }
      printed += separator + line.length;
      lines.push(line);
    },
    isEmpty: () => lines.length === 0,
    output: () => lines.join('\n'),
  };
};

/** Strings verbatim, everything else as JSON the caller can read back. */
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
