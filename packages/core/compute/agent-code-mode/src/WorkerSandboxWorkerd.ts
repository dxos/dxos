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

/** `WorkerSandboxWorkerdEntry` bundled for workerd: {@link RUNTIME_MODULE} and each module it imports, by import name. */
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

/** The `worker_loaders` binding, narrowed to what this uses. */
export type WorkerLoader = {
  readonly get: (id: string, load: () => Promise<WorkerCode>) => { readonly getEntrypoint: () => Entrypoint };
};

export type SpawnOptions = {
  /** The `worker_loaders` binding this deployment was given. */
  readonly loader: WorkerLoader;
  readonly runtime: Runtime;
};

const COMPATIBILITY_DATE = '2026-03-17';

/** Node built-ins and async local storage for the bundle, and the cross-request promise flag EDGE workers pin. */
const COMPATIBILITY_FLAGS = ['nodejs_compat', 'nodejs_als', 'no_handle_cross_request_promise_resolution'];

/**
 * A `WorkerSandbox` spawner for a Worker Loader isolate running {@link Runtime}, used with `refresh`, since the isolate
 * hands over by flush. The isolate is a security boundary: no network, no bindings, and its handle limits the host's
 * services to its own space. See `docs/DESIGN.md`.
 */
export const spawn =
  ({ loader, runtime }: SpawnOptions) =>
  async (_entry: URL | undefined, init: SandboxInit): Promise<WorkerSandbox.WorkerHandle> => {
    // The server greets the worker on open, which may be before the isolate attaches.
    let attached: (deliver: WorkerdBridge.Send) => void = () => {};
    const delivery = new Promise<WorkerdBridge.Send>((resolve) => {
      attached = resolve;
    });
    let detach: () => void = () => {};
    const detached = new Promise<void>((resolve) => {
      detach = resolve;
    });
    const port = new WorkerdBridge.Port(async (batch) => (await delivery)(batch));

    // A fresh id per evaluation: the loader caches isolates by id, and no program may see another's state.
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
    // Settles only on a failure: code that does not parse, or a runtime that failed before its channel opened.
    const stopped = run.then(
      () => new Promise<string | undefined>(() => {}),
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );
    const spaceId = SpaceId.make(init.space.spaceId);
    return {
      port,
      stopped,
      // An isolate cannot be killed: this releases its channel home.
      terminate: () => detach(),
      limit: (echo) => limitToSpace(echo, spaceId),
    };
  };

/** The isolate's entrypoint, with the model's code as the body of a function over the dialect's names. */
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
 * The services limited to the calls one database makes on its space: the host's serve any space (EDGE's do), and code
 * can reach its own client through the objects it holds.
 */
const limitToSpace = (access: WorkerSandbox.EchoAccess, spaceId: SpaceId): WorkerSandbox.EchoAccess => {
  const data = access.DataService;
  const query = access.QueryService;
  const outside = (other: string | undefined) =>
    new Error(`Space ${other ?? '(none)'} is outside this sandbox, which reaches only space ${spaceId}.`);
  const refused = (call: string) => new Error(`${call} is not available inside the sandbox.`);
  // A client chooses its subscription ids and a service shares them across clients: the isolate names only its own.
  const subscriptions = new Set<string>();
  const notOwn = (subscriptionId: string) =>
    new Error(`Subscription ${subscriptionId} was not opened inside this sandbox.`);
  return {
    DataService: {
      'DataService.subscribe': (request, options) => {
        if (request.spaceId !== spaceId) {
          return Stream.fail(outside(request.spaceId));
        }
        subscriptions.add(request.subscriptionId);
        return data['DataService.subscribe'](request, options);
      },
      'DataService.updateSubscription': (request, options) =>
        subscriptions.has(request.subscriptionId)
          ? data['DataService.updateSubscription'](request, options)
          : Effect.fail(notOwn(request.subscriptionId)),
      'DataService.update': (request, options) =>
        subscriptions.has(request.subscriptionId)
          ? data['DataService.update'](request, options)
          : Effect.fail(notOwn(request.subscriptionId)),
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
      // Name any document; the isolate hands over by flush, which needs neither.
      'DataService.getDocumentHeads': () => Effect.fail(refused('getDocumentHeads')),
      'DataService.waitUntilHeadsReplicated': () => Effect.fail(refused('waitUntilHeadsReplicated')),
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

/** The spaces a query names; none for a query that does not decode, which is then refused. */
const targetSpaces = (encoded: string): string[] => {
  const decoded = Schema.decodeUnknownOption(Schema.fromJsonString(QueryAST.Query))(encoded);
  if (decoded._tag === 'None') {
    return [];
  }
  const spaces = new Set<string>();
  QueryAST.visit(decoded.value, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      for (const scope of node.from.scopes) {
        // As db-service routes a query; a scope with no space is refused, since this service has no owning space.
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
