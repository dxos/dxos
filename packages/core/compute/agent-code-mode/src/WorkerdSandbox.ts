//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type BindingsContext } from './Dialect.ts';
import * as Sandbox from './Sandbox.ts';
import { registerHost } from './WorkerdHostWorker.ts';
import { PRELUDE } from './WorkerdSandboxPrelude.ts';

/** The `worker_loaders` binding, narrowed to what this uses. */
export type WorkerLoader = {
  readonly get: (
    id: string,
    load: () => Promise<{
      compatibilityDate: string;
      mainModule: string;
      modules: Record<string, string>;
      globalOutbound: unknown;
    }>,
  ) => { readonly getEntrypoint: () => { readonly fetch: (request: Request) => Promise<Response> } };
};

export type WorkerdSandboxOptions = {
  /** The `worker_loaders` binding this deployment was given. */
  readonly loader: WorkerLoader;
  /**
   * Where a sandboxed isolate's `fetch` is routed — a service binding back to THIS worker, whose
   * default export is {@link WorkerdHostWorker}. It must be a real `Fetcher`: the runtime refuses
   * any other value, which is also why the host cannot simply be passed in the isolate's `env`.
   */
  readonly outbound: unknown;
  /** Registers the handler one evaluation answers through; the module registry by default. */
  readonly register?: typeof registerHost;
};

/**
 * Runs the model's code in a dynamically loaded Cloudflare isolate.
 *
 * This is the only sandbox here that is a SECURITY boundary. The isolate is a separate V8 isolate
 * with a Workers global scope — no `process`, no `require`, no filesystem — and its outbound
 * `fetch` is pinned to the host, so the code reaches exactly the workspace it was given and
 * nothing else. `Sandbox.inProcess` shares the host realm and `WorkerSandbox` shares the host's
 * permissions; neither contains code, they only bound it.
 *
 * The price is that the isolate holds no database. `@dxos/echo-client` cannot run there, so unlike
 * {@link WorkerSandbox} the bindings are NOT rebuilt on the far side: they are a facade whose every
 * call runs home, and what crosses is snapshots and the ids that name the real objects here. That
 * is forced by the boundary rather than chosen — a live object cannot be structured-cloned.
 */
export const make = (options: WorkerdSandboxOptions): Sandbox.Sandbox => ({
  evaluate: ({ code, dialect, context, timeout }) =>
    Effect.gen(function* () {
      const token = `sandbox-${Math.random().toString(36).slice(2)}`;
      const bindings = dialect.bindings(context);
      const objects = new Map<string, HostObject>();

      const release = (options.register ?? registerHost)(token, (call) =>
        dispatch({ bindings, context, objects }, call),
      );
      yield* Effect.addFinalizer(() => Effect.sync(release));

      const isolate = options.loader.get(token, async () => ({
        compatibilityDate: COMPATIBILITY_DATE,
        mainModule: 'main.js',
        modules: { 'main.js': module_(token, code) },
        globalOutbound: options.outbound,
      }));

      const evaluation = Effect.tryPromise({
        try: (signal) => isolate.getEntrypoint().fetch(new Request(`http://sandbox/${token}`, { signal })),
        catch: (error: unknown) => new Sandbox.EvaluationError({ message: describe(error) }),
      });

      // Interrupting the fetch is what "killing" means here: the isolate is loaded per evaluation
      // and nothing else holds it, so abandoning its only request leaves it to be collected.
      //
      // It is the OUTER of two bounds, and usually not the one reached: the runtime cancels a
      // request it can prove will never respond within milliseconds, and in production also
      // enforces a CPU limit. This budget covers what those do not — code that is genuinely
      // waiting on I/O this host is slow to answer.
      const response = yield* timeout === undefined
        ? evaluation
        : evaluation.pipe(
            Effect.timeoutOrElse({
              duration: timeout,
              orElse: () =>
                Effect.fail(
                  new Sandbox.EvaluationError({
                    message: `Evaluation did not finish within ${Duration.format(Duration.fromInputUnsafe(timeout))}; the isolate was abandoned.`,
                  }),
                ),
            }),
          );

      const outcome = yield* Effect.promise(() => response.json() as Promise<Outcome>);
      if (outcome._tag === 'Error') {
        return yield* Effect.fail(new Sandbox.EvaluationError({ message: outcome.message }));
      }
      return outcome.value;
    }).pipe(
      Effect.scoped,
      Effect.catch((error) =>
        Effect.fail(
          error instanceof Sandbox.EvaluationError
            ? error
            : new Sandbox.EvaluationError({ message: `The isolate failed: ${describe(error)}` }),
        ),
      ),
    ),
});

type Outcome = { _tag: 'Ok'; value: unknown } | { _tag: 'Error'; message: string };

/** Pinned rather than taken from the host: the isolate's semantics must not drift with the deployment. */
const COMPATIBILITY_DATE = '2025-10-01';

/** The module the isolate runs: the facade, then the model's code as the body of its fetch handler. */
const module_ = (token: string, code: string): string => `
${PRELUDE(token)}

export default {
  async fetch() {
    try {
      const value = await (async () => {
${code}
      })();
      await __drain();
      return Response.json({ _tag: 'Ok', value: value === undefined ? null : value });
    } catch (error) {
      // Drained here too, so output the program produced before it threw still reaches the model.
      try { await __drain(); } catch {}
      return Response.json({ _tag: 'Error', message: error && error.message ? error.message : String(error) });
    }
  },
};
`;

type HostState = {
  readonly bindings: Record<string, unknown>;
  readonly context: BindingsContext;
  readonly objects: Map<string, HostObject>;
};

/**
 * Runs one call from the isolate against the real bindings.
 *
 * An object leaves here as a snapshot and comes back as one; it is resolved to the live object by
 * id, so `add`, `remove` and `update` act on the workspace's own object rather than on a copy.
 */
const dispatch = async (
  state: HostState,
  { binding, args }: { readonly binding: string; readonly args: readonly unknown[] },
): Promise<unknown> => {
  const { bindings, context, objects } = state;
  const call = <T>(name: string, ...rest: unknown[]) => (bindings[name] as (...a: unknown[]) => T)(...rest);

  const remember = (obj: HostObject) => {
    objects.set(obj.id, obj);
    return snapshot(obj);
  };
  const resolve = (value: unknown): HostObject => {
    const id = (value as { id?: string })?.id;
    const obj = id === undefined ? undefined : objects.get(id);
    if (obj === undefined) {
      throw new Error(`Unknown object: ${id ?? JSON.stringify(value)}`);
    }
    return obj;
  };

  switch (binding) {
    case 'print':
      context.print(...args);
      return null;
    case 'query': {
      const found = await call<Promise<HostObject[]>>('query', args[0], args[1]);
      return found.map(remember);
    }
    case 'make':
      return remember(await call<Promise<HostObject>>('make', args[0], args[1]));
    case 'add':
      return remember(await call<Promise<HostObject>>('add', resolve(args[0])));
    case 'remove':
      await call<Promise<unknown>>('remove', resolve(args[0]));
      return null;
    case 'flush':
      await call<Promise<unknown>>('flush');
      return null;
    case 'update': {
      const patch = args[1] as Record<string, unknown>;
      const obj = resolve(args[0]);
      // Applied through the dialect's own `update`, not by touching the object: the mutator form
      // is what the dialect guarantees, and going through it keeps this module free of any ECHO
      // import — which matters, since it may run in a worker where that graph cannot load.
      call<unknown>('update', obj, (target: Record<string, unknown>) => Object.assign(target, patch));
      return snapshot(obj);
    }
    case 'invoke': {
      const name = String(args[0]);
      const operation = (bindings.ops as Record<string, (input: unknown) => Promise<unknown>>)[name];
      if (operation === undefined) {
        throw new Error(`Unknown operation: ${name}`);
      }
      return await operation(args[1]);
    }
    default:
      throw new Error(`Unknown binding: ${binding}`);
  }
};

/** Anything the host's bindings hand back that the isolate may later name again. */
type HostObject = { readonly id: string };

/**
 * What an object looks like inside the isolate: its data, plus the id that names it back here.
 *
 * Serialized through JSON rather than spread, since a live object is a proxy whose own keys are
 * not its data, and only what survives a structured clone can cross anyway.
 */
const snapshot = (obj: HostObject): Record<string, unknown> => ({
  ...(JSON.parse(JSON.stringify(obj)) as Record<string, unknown>),
  id: obj.id,
});

const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};

/** Installs {@link make} as the ambient sandbox. */
export const layer = (options: WorkerdSandboxOptions): Layer.Layer<Sandbox.Service> =>
  Layer.succeed(Sandbox.Service, make(options));
