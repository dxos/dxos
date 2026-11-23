//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { QueryAST } from '@dxos/echo';
import { EID, SpaceId } from '@dxos/keys';

import * as WorkerdBridge from './WorkerdBridge.ts';
import type * as WorkerSandbox from './WorkerSandbox.ts';
import { type SandboxInit } from './WorkerSandboxProtocol.ts';

/** The module of a {@link Runtime} that the program imports `serve` from. */
export const RUNTIME_MODULE = 'runtime.js';

/** The module the spawner writes for each evaluation: the isolate's entrypoint, with the model's code compiled in. */
const PROGRAM_MODULE = 'program.js';

/** A module as the Worker Loader takes it. */
export type Module = { readonly js: string } | { readonly wasm: ArrayBuffer };

/**
 * `WorkerSandboxWorkerdEntry`, bundled for workerd by the deployment: {@link RUNTIME_MODULE} and every module it imports
 * (its chunks, the Automerge wasm) under the names it imports them by.
 */
export type Runtime = {
  readonly modules: Readonly<Record<string, Module>>;
};

/** What the isolate's program exports. */
export type Entrypoint = {
  readonly run: (
    init: SandboxInit,
    post: WorkerdBridge.Send,
    attach: (deliver: WorkerdBridge.Send) => Promise<void>,
  ) => Promise<void>;
};

/** The isolate the spawner asks the loader for. */
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

export type SpawnOptions = {
  /** The `worker_loaders` binding this deployment was given. */
  readonly loader: WorkerLoader;
  readonly runtime: Runtime;
};

/** The date the program is written against; the runtime bundle's own needs come in as flags. */
const COMPATIBILITY_DATE = '2026-03-17';

/**
 * What a runtime bundled the way EDGE bundles workers needs: Node built-ins its dependencies import, async local
 * storage, and the flag every EDGE worker pins (past its default date a promise settled from another request's context
 * has its continuation dropped, which the code would see as a hung `await`).
 */
const COMPATIBILITY_FLAGS = ['nodejs_compat', 'nodejs_als', 'no_handle_cross_request_promise_resolution'];

/**
 * A `WorkerSandbox` spawner for a Cloudflare Worker Loader isolate running {@link Runtime}, as `WorkerSandboxBrowser`'s
 * is for a Web Worker: `WorkerSandbox.make({ echo, spawn: WorkerSandboxWorkerd.spawn({ loader, runtime }) })`.
 *
 * Three things differ from a thread. The isolate cannot be handed a `MessagePort`, so the worker protocol travels over
 * two Workers RPC functions ({@link WorkerdBridge}). Workerd has no `eval`, so the model's code is compiled into the
 * program module written for each evaluation, a fresh isolate each time. And the isolate is a SECURITY boundary — no
 * network (`globalOutbound: null`), no bindings — so the handle limits the host's services to the evaluation's space
 * and to the calls a client of one database makes, whatever else they could serve; no caller can leave that out.
 *
 * The price is the runtime: every evaluation loads its own copy of ECHO and Automerge, and loads each document the code
 * touches from the host.
 */
export const spawn =
  ({ loader, runtime }: SpawnOptions) =>
  async (_entry: URL | undefined, init: SandboxInit): Promise<WorkerSandbox.WorkerHandle> => {
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
    const port = new WorkerdBridge.Port(async (batch) => (await delivery)(batch));

    // A fresh id per evaluation: the loader caches isolates by id, and one program must never observe another's state.
    const isolate = loader.get(`code-mode-${crypto.randomUUID()}`, async () => ({
      compatibilityDate: COMPATIBILITY_DATE,
      compatibilityFlags: COMPATIBILITY_FLAGS,
      mainModule: PROGRAM_MODULE,
      modules: { ...runtime.modules, [PROGRAM_MODULE]: { js: program(init) } },
      env: {},
      globalOutbound: null,
    }));

    const run = isolate.getEntrypoint().run(
      init,
      async (batch) => port.receive(batch),
      (deliver) => {
        attached(deliver);
        return detached;
      },
    );
    // Ends once the runtime has reported, so only a failure says anything: a program that does not load (the model's
    // code does not parse), or a runtime that failed before its channel opened.
    const stopped = run.then(
      () => new Promise<string | undefined>(() => {}),
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );
    const spaceId = SpaceId.make(init.space.spaceId);
    return {
      port,
      stopped,
      // An isolate cannot be killed: this releases its channel home, and the sandbox has already stopped answering it.
      terminate: () => detach(),
      limit: (echo) => limitToSpace(echo, spaceId),
    };
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
    `    return serve(init, post, attach, async ({ ${names.join(', ')} }) => {`,
    code,
    '    });',
    '  }',
    '}',
    '',
  ].join('\n');

/**
 * The services as the isolate may use them: the calls a client of one database makes, on that database's space.
 * Everything here runs with the host's authority — on EDGE, a data service that serves any space — and the code holds
 * live objects, through which it can reach its own client and ask for any of it. Reindexing, index configuration,
 * statistics and garbage collection are refused outright.
 */
const limitToSpace = (access: WorkerSandbox.EchoAccess, spaceId: SpaceId): WorkerSandbox.EchoAccess => {
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
  const decoded = Schema.decodeUnknownOption(Schema.fromJsonString(QueryAST.Query))(encoded);
  if (decoded._tag === 'None') {
    return [];
  }
  const spaces = new Set<string>();
  QueryAST.visit(decoded.value, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      for (const scope of node.from.scopes) {
        // As db-service routes a query: a space scope by its id, a feed scope by the space its feed belongs to. A scope
        // that names no space targets the owning one, which a service with no database of its own cannot pick.
        if (scope._tag === 'space') {
          spaces.add(scope.spaceId ?? '');
        } else if (scope._tag === 'feed') {
          const feed = EID.tryParse(scope.feedUri);
          spaces.add((feed && EID.getSpaceId(feed)) ?? '');
        }
      }
    }
  });
  return [...spaces];
};
