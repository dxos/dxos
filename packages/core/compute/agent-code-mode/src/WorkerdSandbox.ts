//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { type BindingsContext } from './Dialect.ts';
import * as Sandbox from './Sandbox.ts';
import MAIN from './workerd/main.mjs?raw';
import PRELUDE from './workerd/prelude.mjs?raw';

/** The key of the marker `ref(obj)` returns in the isolate, which the host turns into a reference to `obj`. */
const REF_MARKER = '@dxos/agent-code-mode/ref';

/**
 * Answers one call the sandboxed code makes: a binding's name and its arguments. A refusal is returned rather than
 * thrown, since the runtime reports an RPC callee's throw as uncaught; the isolate's facade raises it as an error.
 */
export type HostCall = (binding: string, args: readonly unknown[]) => Promise<Outcome>;

/** The isolate's entrypoint (`workerd/main.mjs`): it runs the code, answering its calls through `host`. */
export type SandboxEntrypoint = { readonly run: (host: HostCall) => Promise<unknown> };

/**
 * The `worker_loaders` binding, narrowed to what this uses. A deployment adapts its own binding, whose entrypoint is
 * typed by the RPC interface it is asked for (`getEntrypoint<T>()`).
 */
export type WorkerLoader = {
  readonly get: (
    id: string,
    load: () => Promise<{
      compatibilityDate: string;
      compatibilityFlags?: string[];
      mainModule: string;
      modules: Record<string, { js: string }>;
      env: Record<string, string>;
      globalOutbound: null;
    }>,
  ) => { readonly getEntrypoint: () => SandboxEntrypoint };
};

export type WorkerdSandboxOptions = {
  /** The `worker_loaders` binding this deployment was given. */
  readonly loader: WorkerLoader;
};

/**
 * Runs the model's code in a dynamically loaded Cloudflare isolate.
 *
 * This is the only sandbox here that is a SECURITY boundary. The isolate is a separate V8 isolate
 * with a Workers global scope — no `process`, no `require`, no filesystem — and no network
 * (`globalOutbound: null`). It reaches only the function it is called with, which answers every
 * binding here, so the code reaches exactly the workspace it was given and nothing else.
 * `Sandbox.inProcess` shares the host realm and `WorkerSandbox` shares the host's permissions;
 * neither contains code, they only bound it.
 *
 * The calls come back over Workers RPC into the invocation that started the isolate, so they reach
 * this evaluation's bindings wherever it runs, including inside a Durable Object.
 *
 * The price is that the isolate holds no database. `@dxos/echo-client` cannot run there, so unlike
 * `WorkerSandbox` the bindings are NOT rebuilt on the far side: they are a facade whose every
 * call runs home, and what crosses is snapshots and the ids that name the real objects here. That
 * is forced by the boundary rather than chosen — a live object cannot be structured-cloned.
 */
export const make = (options: WorkerdSandboxOptions): Sandbox.Sandbox => ({
  evaluate: ({ code, dialect, context, timeout }) =>
    Effect.gen(function* () {
      const bindings = dialect.bindings(context);
      const objects = new Map<string, HostObject>();
      const host: HostCall = (binding, args) =>
        dispatch({ bindings, context, objects }, binding, args).then(
          (value): Outcome => ({ _tag: 'Ok', value }),
          (error: unknown): Outcome => ({ _tag: 'Error', message: describe(error) }),
        );

      // A fresh id per evaluation: the loader caches isolates by id, and one program must never
      // observe another's module state.
      const isolate = options.loader.get(`sandbox-${crypto.randomUUID()}`, async () => ({
        compatibilityDate: COMPATIBILITY_DATE,
        compatibilityFlags: COMPATIBILITY_FLAGS,
        mainModule: 'main.mjs',
        modules: modules(code),
        env: { REF_MARKER },
        globalOutbound: null,
      }));

      // Abandoning the call is what "killing" means here: the isolate is loaded per evaluation and
      // nothing else holds it, so it is left to be collected.
      //
      // It is the OUTER of two bounds, and usually not the one reached: the runtime cancels a call
      // it can prove will never complete within milliseconds, and in production also enforces a CPU
      // limit. This budget covers what those do not — code that is genuinely waiting on I/O this
      // host is slow to answer.
      const evaluation = Effect.tryPromise({
        // Taking the signal is what lets the timeout interrupt the call; an RPC call cannot be aborted, so it abandons it.
        try: (_signal) => isolate.getEntrypoint().run(host),
        catch: (error: unknown) => new Sandbox.EvaluationError({ message: describe(error) }),
      });
      const result = yield* timeout === undefined
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
      const outcome = yield* Schema.decodeUnknownEffect(Outcome)(result).pipe(
        Effect.mapError(() => new Sandbox.EvaluationError({ message: 'The isolate returned an unreadable result.' })),
      );
      if (outcome._tag === 'Error') {
        return yield* Effect.fail(new Sandbox.EvaluationError({ message: outcome.message }));
      }
      return outcome.value;
    }).pipe(
      Effect.catch((error) =>
        Effect.fail(
          error instanceof Sandbox.EvaluationError
            ? error
            : new Sandbox.EvaluationError({ message: `The isolate failed: ${describe(error)}` }),
        ),
      ),
    ),
});

/** What the isolate's `run` returns, and what the host answers each of its calls with. */
type Outcome = typeof Outcome.Type;
const Outcome = Schema.Union([
  Schema.TaggedStruct('Ok', { value: Schema.Unknown }),
  Schema.TaggedStruct('Error', { message: Schema.String }),
]);

/**
 * Pinned rather than taken from the host, so the isolate's semantics do not drift with the deployment. The flag matches
 * EDGE's deployed workers: past its default date a promise settled from another request's context has its continuation
 * dropped, which a program would see as a hung `await`.
 */
const COMPATIBILITY_DATE = '2026-03-17';
const COMPATIBILITY_FLAGS = ['no_handle_cross_request_promise_resolution'];

/** The names `prelude.mjs` exports for the model's code. */
const FACADE = [
  'print',
  'describe',
  'relations',
  'children',
  'referrers',
  'query',
  'make',
  'add',
  'remove',
  'flush',
  'ref',
  'update',
  'ops',
];

/** The isolate's modules: its entrypoint, the facade, and the model's code as the body of the program `main` runs. */
const modules = (code: string): Record<string, { js: string }> => ({
  'main.mjs': { js: MAIN },
  'prelude.mjs': { js: PRELUDE },
  'program.mjs': {
    js: `import { ${FACADE.join(', ')} } from './prelude.mjs';\nexport default async () => {\n${code}\n};\n`,
  },
});

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
const dispatch = async (state: HostState, binding: string, args: readonly unknown[]): Promise<unknown> => {
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
  /** An object the bindings take by id or as the object itself: an id passes through, a snapshot resolves. */
  const target = (value: unknown): unknown => (typeof value === 'string' ? value : resolve(value));
  const revive = (value: unknown) => reviveValue(value, objects, (obj) => call('ref', obj), 0);

  switch (binding) {
    case 'print':
      context.print(...args.map(revive));
      return null;
    case 'describe':
      return await call<Promise<string>>('describe', target(args[0]));
    case 'relations':
      return (
        await call<Promise<HostObject[]>>('relations', target(args[0]), args[1] ?? undefined, args[2] ?? undefined)
      ).map(remember);
    case 'children':
      return (await call<Promise<HostObject[]>>('children', target(args[0]))).map(remember);
    case 'referrers':
      return (
        await call<Promise<HostObject[]>>('referrers', target(args[0]), args[1] ?? undefined, args[2] ?? undefined)
      ).map(remember);
    case 'query': {
      const found = await call<Promise<HostObject[]>>('query', args[0], args[1] ?? undefined);
      return found.map(remember);
    }
    case 'make':
      return remember(await call<Promise<HostObject>>('make', args[0], revive(args[1])));
    case 'add':
      return remember(await call<Promise<HostObject>>('add', resolve(args[0])));
    case 'remove':
      await call<Promise<unknown>>('remove', resolve(args[0]));
      return null;
    case 'flush':
      await call<Promise<unknown>>('flush');
      return null;
    case 'update': {
      const patch = revive(args[1]) as Record<string, unknown>;
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
      return toWire(await operation(revive(args[1])));
    }
    default:
      throw new Error(`Unknown binding: ${binding}`);
  }
};

/** Anything the host's bindings hand back that the isolate may later name again. */
type HostObject = { readonly id: string };

const MAX_DEPTH = 8;

/**
 * A value from the isolate with what it names put back: a `ref(obj)` marker becomes a reference to the object, and a
 * snapshot becomes the live object it was taken from, so the bindings see what the same code would hold in-process.
 */
const reviveValue = (
  value: unknown,
  objects: ReadonlyMap<string, HostObject>,
  ref: (obj: HostObject) => unknown,
  depth: number,
): unknown => {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => reviveValue(entry, objects, ref, depth + 1));
  }
  const record = value as Record<string, unknown>;
  const marked = record[REF_MARKER];
  if (typeof marked === 'string') {
    const obj = objects.get(marked);
    if (obj === undefined) {
      throw new Error(`Unknown object: ${marked}`);
    }
    return ref(obj);
  }
  const known = typeof record.id === 'string' ? objects.get(record.id) : undefined;
  if (known !== undefined) {
    return known;
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, reviveValue(entry, objects, ref, depth + 1)]),
  );
};

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

/** An operation's result as it can cross: JSON, as the isolate's own output is. */
const toWire = (value: unknown): unknown => (value === undefined ? null : JSON.parse(JSON.stringify(value) ?? 'null'));

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
