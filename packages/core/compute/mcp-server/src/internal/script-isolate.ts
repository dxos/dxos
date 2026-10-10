//
// Copyright 2026 DXOS.org
//

/** Module the isolate imports Effect from; the runner bundles `effect` under this name. */
export const EFFECT_MODULE = 'effect.js';

/**
 * The main module of a Worker Loader isolate that runs one script.
 *
 * Emitted as source because the isolate is a separate runtime with its own module graph: nothing
 * from this process crosses but text. The contract with the runner that loads it:
 *
 * - {@link EFFECT_MODULE} exports the `Cause`, `Data`, `Effect` and `Exit` namespaces of `effect`.
 * - `env.HOST.call(binding, args)` answers each call with a `ScriptOutcome`; the host decides it
 *   with `scriptCallOutcome`, so the isolate holds no authority of its own.
 * - The default export's `fetch` answers with a `ScriptResult` as JSON, whatever the program did,
 *   its `stats` counting the calls the program made through `env.HOST`.
 *
 * The program is compiled at module scope, so the only names it can reach are its bindings and the
 * module's own helpers — not `env`, and not the request.
 */
export const module = ({
  code,
  spaceId,
  skillTokens,
  maxOutput,
}: {
  readonly code: string;
  readonly spaceId?: string;
  readonly skillTokens: readonly string[];
  readonly maxOutput: number;
}): string => `import { Cause, Data, Effect, Exit } from './${EFFECT_MODULE}';

class ToolFailure extends Data.TaggedError('ToolFailure') {}

const __format = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

const __describe = (error) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};

const __printer = (maxOutput) => {
  const lines = [];
  let printed = 0;
  let truncated = false;
  return {
    print: (...values) => {
      if (truncated) {
        return;
      }
      const line = values.map(__format).join(' ');
      const separator = lines.length > 0 ? 1 : 0;
      if (printed + separator + line.length > maxOutput) {
        lines.push(line.slice(0, Math.max(0, maxOutput - printed - separator)) + '\\n[output truncated]');
        truncated = true;
        return;
      }
      printed += separator + line.length;
      lines.push(line);
    },
    isEmpty: () => lines.length === 0,
    output: () => lines.join('\\n'),
  };
};

const __program = ({ spaceId, print, invoke, queryOperations, loadSkill }) =>
  Effect.gen(function* () {
${code}
  });

export default {
  async fetch(_request, env) {
    const printer = __printer(${JSON.stringify(maxOutput)});
    // The tokens the program holds: the caller's, plus each one its own loadSkill returns.
    const tokens = new Set(${JSON.stringify(skillTokens)});
    const stats = { calls: 0, callMs: 0 };
    const call = (binding, args) =>
      Effect.tryPromise({
        try: async () => {
          const start = performance.now();
          stats.calls++;
          try {
            return await env.HOST.call(binding, args);
          } finally {
            stats.callMs += performance.now() - start;
          }
        },
        catch: (error) => new ToolFailure({ code: 'operation_failed', message: __describe(error) }),
      }).pipe(
        Effect.flatMap((outcome) =>
          outcome._tag === 'Ok'
            ? Effect.succeed(outcome.value)
            : Effect.fail(new ToolFailure({ code: outcome.code, message: outcome.message })),
        ),
      );
    try {
      const exit = await Effect.runPromiseExit(
        __program({
          spaceId: ${JSON.stringify(spaceId ?? null)} ?? undefined,
          print: (...values) => Effect.sync(() => printer.print(...values)),
          invoke: (key, input, options) =>
            call('invoke', [
              key,
              input,
              options !== null && typeof options === 'object' && !Array.isArray(options)
                ? { ...options, skillTokens: [...tokens] }
                : { skillTokens: [...tokens] },
            ]),
          queryOperations: (...args) => call('queryOperations', args),
          loadSkill: (...args) =>
            call('loadSkill', args).pipe(
              Effect.tap((listing) =>
                Effect.sync(() => {
                  if (listing && typeof listing.skillToken === 'string') {
                    tokens.add(listing.skillToken);
                  }
                }),
              ),
            ),
        }),
      );
      const callStats = () => ({ calls: stats.calls, callMs: Math.round(stats.callMs) });
      if (Exit.isSuccess(exit)) {
        if (exit.value !== undefined && printer.isEmpty()) {
          printer.print(exit.value);
        }
        return Response.json({ output: printer.output(), stats: callStats() });
      }
      return Response.json({
        output: printer.output(),
        error: __describe(Cause.squash(exit.cause)),
        stats: callStats(),
      });
    } catch (error) {
      return Response.json({
        output: printer.output(),
        error: __describe(error),
        stats: { calls: stats.calls, callMs: Math.round(stats.callMs) },
      });
    }
  },
};
`;
