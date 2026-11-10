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
      const objects = new Map<string, HeldObject>();
      // Closed when the evaluation ends, however it ends: an abandoned isolate keeps running, and its later calls must
      // not write to a workspace whose turn was already told the evaluation failed.
      let closed = false;
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          closed = true;
        }),
      );
      const host: HostCall = (binding, args) =>
        closed
          ? Promise.resolve({ _tag: 'Error', message: 'The evaluation is over.' })
          : dispatch({ bindings, context, objects }, binding, args).then(
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
      // nothing else holds it, so it is left to be collected. It may keep executing until then; the
      // closed host is what stops it from reaching the workspace.
      //
      // It is the OUTER of two bounds, and usually not the one reached: the runtime cancels a call
      // it can prove will never complete within milliseconds, and in production also enforces a CPU
      // limit. This budget covers what those do not — code that is genuinely waiting on I/O this
      // host is slow to answer.
      const evaluation = Effect.tryPromise({
        // Taking the signal is what lets the timeout interrupt the call. An RPC call cannot be aborted, so this
        // abandons the call rather than stopping the isolate, which keeps executing.
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
  readonly objects: Map<string, HeldObject>;
};

/** Anything the host's bindings hand back that the isolate may later name again. */
type HostObject = { readonly id: string };

/** An object handed to the isolate: the live object, and the snapshot as the isolate holds it, in canonical JSON. */
type HeldObject = { readonly live: HostObject; view: string };

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
    const view = snapshot(obj);
    objects.set(obj.id, { live: obj, view: canonical(view) });
    return view;
  };
  const resolve = (value: unknown): HostObject => {
    const id = typeof value === 'string' ? value : (value as { id?: string })?.id;
    const held = id === undefined ? undefined : objects.get(id);
    if (held === undefined) {
      throw new Error(`Unknown object: ${id ?? JSON.stringify(value)}`);
    }
    return held.live;
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
      const sent = args[1] as Record<string, unknown>;
      const patch = revive(sent) as Record<string, unknown>;
      const obj = resolve(args[0]);
      // Applied through the dialect's own `update`, not by touching the object: the mutator form
      // is what the dialect guarantees, and going through it keeps this module free of any ECHO
      // import — which matters, since it may run in a worker where that graph cannot load.
      call<unknown>('update', obj, (target: Record<string, unknown>) => Object.assign(target, patch));
      // The isolate applied the same change to its snapshot, so that is what it now holds.
      const held = objects.get(obj.id);
      if (held !== undefined) {
        held.view = canonical({ ...(JSON.parse(held.view) as Record<string, unknown>), ...sent });
      }
      return null;
    }
    case 'invoke': {
      const name = String(args[0]);
      const operation = (bindings.ops as Record<string, (input: unknown) => Promise<unknown>>)[name];
      if (operation === undefined) {
        throw new Error(`Unknown operation: ${name}`);
      }
      return rememberResult(await operation(revive(args[1])), objects, remember, 0);
    }
    default:
      throw new Error(`Unknown binding: ${binding}`);
  }
};

const MAX_DEPTH = 8;

/**
 * A value from the isolate with what it names put back: a `ref(obj)` marker becomes a reference to the object, and a
 * snapshot becomes the live object it was taken from, so the bindings see what the same code would hold in-process.
 *
 * Only a snapshot the code left as it was is replaced: one it changed, or a record that merely shares an id, stays
 * data, so its changes are not dropped in favour of the live object.
 */
const reviveValue = (
  value: unknown,
  objects: ReadonlyMap<string, HeldObject>,
  ref: (obj: HostObject) => unknown,
  depth: number,
): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth > MAX_DEPTH) {
    if (JSON.stringify(value).includes(JSON.stringify(REF_MARKER))) {
      throw new Error(`A ref() nested more than ${MAX_DEPTH} levels deep cannot be resolved; pass it nearer the top.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => reviveValue(entry, objects, ref, depth + 1));
  }
  const record = value as Record<string, unknown>;
  const marked = record[REF_MARKER];
  if (typeof marked === 'string') {
    const held = objects.get(marked);
    if (held === undefined) {
      throw new Error(`Unknown object: ${marked}`);
    }
    return ref(held.live);
  }
  const held = typeof record.id === 'string' ? objects.get(record.id) : undefined;
  if (held !== undefined && canonical(record) === held.view) {
    return held.live;
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, reviveValue(entry, objects, ref, depth + 1)]),
  );
};

/**
 * An operation's result as it can cross: JSON, as the isolate's own output is, with each object in it that has an id
 * remembered, so the code can pass it back as it does a query's results. An id already held keeps its object.
 */
const rememberResult = (
  value: unknown,
  objects: ReadonlyMap<string, HeldObject>,
  remember: (obj: HostObject) => Record<string, unknown>,
  depth: number,
): unknown => {
  if (value === undefined) {
    return null;
  }
  if (value === null || typeof value !== 'object' || depth > MAX_DEPTH) {
    return JSON.parse(JSON.stringify(value) ?? 'null');
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rememberResult(entry, objects, remember, depth + 1));
  }
  if (isHostObject(value) && !objects.has(value.id)) {
    return remember(value);
  }
  const json: unknown = JSON.parse(JSON.stringify(value) ?? 'null');
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return json;
  }
  // Walked over the live value's own fields, so an object nested in a plain result is remembered too.
  return Object.fromEntries(
    Object.keys(json).map((key) => [key, rememberResult(Reflect.get(value, key), objects, remember, depth + 1)]),
  );
};

const isHostObject = (value: object): value is HostObject => 'id' in value && typeof value.id === 'string';

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

/** JSON with every object's keys sorted, so two values compare equal however their keys were ordered. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, entry: unknown) =>
    entry !== null && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)))
      : entry,
  );

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
