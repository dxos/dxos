//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { QueryAST } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

import * as Sandbox from './Sandbox.ts';
import * as WorkerdBridge from './WorkerdBridge.ts';
import * as WorkerSandbox from './WorkerSandbox.ts';
import { type SandboxInit } from './WorkerSandboxProtocol.ts';

/** The module of a {@link Runtime} that the program imports `serve` from. */
export const RUNTIME_MODULE = 'runtime.js';

/** The module this sandbox writes for each evaluation: the isolate's entrypoint, with the model's code compiled in. */
const PROGRAM_MODULE = 'program.js';

/** A module as the Worker Loader takes it. */
export type Module = { readonly js: string } | { readonly wasm: ArrayBuffer };

/**
 * `WorkerdEchoRuntime.ts`, bundled for workerd by the deployment: {@link RUNTIME_MODULE} and every module it imports
 * (its chunks, the Automerge wasm) under the names it imports them by.
 */
export type Runtime = {
  readonly modules: Readonly<Record<string, Module>>;
  /** What the bundle needs from the runtime; defaults to {@link COMPATIBILITY_FLAGS}. */
  readonly compatibilityFlags?: readonly string[];
};

/** What the isolate's program exports. */
export type Entrypoint = {
  readonly run: (
    init: SandboxInit,
    post: WorkerdBridge.Send,
    attach: (deliver: WorkerdBridge.Send) => Promise<void>,
  ) => Promise<void>;
};

/** The isolate this sandbox asks the loader for. */
export type WorkerCode = {
  compatibilityDate: string;
  compatibilityFlags: string[];
  mainModule: string;
  modules: Record<string, Module>;
  env: Record<string, never>;
  globalOutbound: null;
};

/**
 * The `worker_loaders` binding, narrowed to what this uses. A deployment adapts its own binding, whose entrypoint is
 * typed by the RPC interface it is asked for (`getEntrypoint<T>()`).
 */
export type WorkerLoader = {
  readonly get: (id: string, load: () => Promise<WorkerCode>) => { readonly getEntrypoint: () => Entrypoint };
};

export type Options = {
  /** The `worker_loaders` binding this deployment was given. */
  readonly loader: WorkerLoader;
  readonly runtime: Runtime;
  /**
   * The host's ECHO services for the space the code runs against. The isolate reaches only that space through them,
   * whatever else they could serve.
   */
  readonly echo: (spaceId: SpaceId) => WorkerSandbox.EchoAccess;
  /** See `WorkerSandbox.Options.refresh`; required by services that cannot report heads, as EDGE's cannot. */
  readonly refresh?: () => Promise<void>;
};

/**
 * Runs the model's code in a Worker Loader isolate against its own ECHO client, so a dialect gets its real bindings —
 * live objects, `Database.query`, `Obj.update` — rather than the snapshot facade `WorkerdSandbox` marshals.
 *
 * This is `WorkerSandbox` with the thread swapped for an isolate: the same runtime and protocol, carried over Workers
 * RPC by {@link WorkerdBridge} instead of a `MessagePort`, with the code compiled into the program module, since
 * workerd has no `eval`. As with `WorkerdSandbox`, the isolate is a SECURITY boundary: it has no network
 * (`globalOutbound: null`) and no bindings, and reaches only the two functions it is called with. What those serve is
 * limited here to the evaluation's space and to the calls a client of one database makes.
 *
 * The price is the runtime: every evaluation loads its own copy of ECHO and Automerge into a fresh isolate, and loads
 * each document the code touches from the host.
 */
export const make = (options: Options): Sandbox.Sandbox =>
  WorkerSandbox.make({
    echo: (spaceId) => scope(options.echo(spaceId), spaceId),
    // Named so the sandbox does not derive a file next to its own module, which a bundle in workerd has no URL for.
    entry: new URL(`workerd:${RUNTIME_MODULE}`),
    spawn: (_entry, init) => spawn(options, init),
    ...(options.refresh !== undefined && { refresh: options.refresh }),
  });

/** Installs {@link make} as the ambient sandbox. */
export const layer = (options: Options): Layer.Layer<Sandbox.Service> => Layer.succeed(Sandbox.Service, make(options));

/** The date the program is written against; the runtime bundle's own needs come in as flags. */
const COMPATIBILITY_DATE = '2026-03-17';

/**
 * What a runtime bundled the way EDGE bundles workers needs: Node built-ins its dependencies import, async local
 * storage, and the flag every EDGE worker pins (past its default date a promise settled from another request's context
 * has its continuation dropped, which the code would see as a hung `await`).
 */
export const COMPATIBILITY_FLAGS: readonly string[] = [
  'nodejs_compat',
  'nodejs_als',
  'no_handle_cross_request_promise_resolution',
];

const spawn = async ({ loader, runtime }: Options, init: SandboxInit): Promise<WorkerSandbox.WorkerHandle> => {
  // The host's end waits for the isolate to attach before its first batch, since the server greets the worker as soon
  // as it opens, which may be before the isolate has started.
  let attached: (deliver: WorkerdBridge.Send) => void = () => {};
  const delivery = new Promise<WorkerdBridge.Send>((resolve) => {
    attached = resolve;
  });
  let detach: () => void = () => {};
  const detached = new Promise<void>((resolve) => {
    detach = resolve;
  });
  const end = WorkerdBridge.makeEnd(async (batch) => (await delivery)(batch));

  // A fresh id per evaluation: the loader caches isolates by id, and one program must never observe another's state.
  const isolate = loader.get(`code-mode-${crypto.randomUUID()}`, async () => ({
    compatibilityDate: COMPATIBILITY_DATE,
    compatibilityFlags: [...(runtime.compatibilityFlags ?? COMPATIBILITY_FLAGS)],
    mainModule: PROGRAM_MODULE,
    modules: { ...runtime.modules, [PROGRAM_MODULE]: { js: program(init) } },
    env: {},
    globalOutbound: null,
  }));

  const run = isolate.getEntrypoint().run(
    init,
    async (batch) => end.receive(batch),
    (deliver) => {
      attached(deliver);
      return detached;
    },
  );
  // Ends once the runtime has reported, so only a failure says anything: a program that does not load (the model's
  // code does not parse), or a runtime that failed before its channel opened.
  const stopped = run.then(
    () => new Promise<string | undefined>(() => {}),
    (error: unknown) => describe(error),
  );
  // An isolate cannot be killed: this releases its channel home, and the sandbox has already stopped answering it.
  return { port: end.port, stopped, terminate: () => detach() };
};

/**
 * The isolate's entrypoint: the model's code is the body of the function `serve` runs with the dialect's bindings, which
 * it destructures by name. Strict, as every module is.
 */
const program = ({ code, names }: SandboxInit): string =>
  [
    `import { WorkerEntrypoint } from 'cloudflare:workers';`,
    `import { serve } from './${RUNTIME_MODULE}';`,
    'export default class extends WorkerEntrypoint {',
    '  run(init, post, attach) {',
    `    return serve(init, post, attach, async ({ ${names.filter((name) => IDENTIFIER.test(name)).join(', ')} }) => {`,
    code,
    '    });',
    '  }',
    '}',
    '',
  ].join('\n');

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * The services as the isolate may use them: the calls a client of one database makes, on that database's space.
 * Everything here runs with the host's authority — on EDGE, a data service that serves any space — and the code holds
 * live objects, through which it can reach its own client and ask for any of it. Reindexing, index configuration,
 * statistics and garbage collection are refused outright.
 */
const scope = (access: WorkerSandbox.EchoAccess, spaceId: SpaceId): WorkerSandbox.EchoAccess => {
  const data = access.DataService;
  const query = access.QueryService;
  const outside = (other: string | undefined) =>
    new Error(`Space ${other ?? '(none)'} is outside this sandbox, which reaches only space ${spaceId}.`);
  const refused = (call: string) => new Error(`${call} is not available inside the sandbox.`);
  return {
    DataService: {
      'DataService.subscribe': (request, options) =>
        request.spaceId === spaceId
          ? data['DataService.subscribe'](request, options)
          : Stream.fail(outside(request.spaceId)),
      // Bound to the space its subscription was opened on, which `subscribe` checked.
      'DataService.updateSubscription': (request, options) => data['DataService.updateSubscription'](request, options),
      'DataService.update': (request, options) => data['DataService.update'](request, options),
      'DataService.createDocument': (request, options) =>
        request.spaceId === spaceId
          ? data['DataService.createDocument'](request, options)
          : Effect.fail(outside(request.spaceId)),
      'DataService.flush': (request, options) => data['DataService.flush'](request, options),
      // Waits for pending index updates, as every `db.flush()` does; it changes nothing.
      'DataService.updateIndexes': (request, options) => data['DataService.updateIndexes'](request, options),
      // The host's index progress, which every client follows from the moment it opens.
      'DataService.subscribeIndexStatus': (request, options) =>
        data['DataService.subscribeIndexStatus'](request, options),
      'DataService.subscribeIndexActivity': (request, options) =>
        data['DataService.subscribeIndexActivity'](request, options),
      'DataService.getDocumentHeads': (request, options) => data['DataService.getDocumentHeads'](request, options),
      'DataService.waitUntilHeadsReplicated': (request, options) =>
        data['DataService.waitUntilHeadsReplicated'](request, options),
      'DataService.subscribeSpaceSyncState': (request, options) =>
        request.spaceId === spaceId
          ? data['DataService.subscribeSpaceSyncState'](request, options)
          : Stream.fail(outside(request.spaceId)),
      'DataService.reIndexHeads': () => Effect.fail(refused('reIndexHeads')),
      'DataService.stats': () => Effect.fail(refused('stats')),
      'DataService.runGarbageCollection': () => Effect.fail(refused('runGarbageCollection')),
    },
    QueryService: {
      'QueryService.execQuery': (request, options) => {
        const targets = targetSpaces(request.query);
        const other = targets.find((target) => target !== spaceId);
        return targets.length > 0 && other === undefined
          ? query['QueryService.execQuery'](request, options)
          : Stream.fail(outside(other));
      },
      'QueryService.setConfig': () => Effect.fail(refused('setConfig')),
      'QueryService.reindex': () => Effect.fail(refused('reindex')),
    },
  };
};

/**
 * The spaces a query names, as the data service resolves them. Empty for a query that cannot be read, which is then
 * refused rather than passed on for a service to interpret.
 */
const targetSpaces = (encoded: string): string[] => {
  const decoded = Schema.decodeUnknownOption(QueryAST.Query)(parseJson(encoded));
  if (decoded._tag === 'None') {
    return [];
  }
  const spaces = new Set<string>();
  QueryAST.visit(decoded.value, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      for (const scope of node.from.scopes) {
        if (scope._tag === 'space') {
          // A scope with no space targets the owning one, which a service with no database of its own cannot pick.
          spaces.add(scope.spaceId ?? '');
        }
      }
    }
  });
  return [...spaces];
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};
