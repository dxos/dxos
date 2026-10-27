//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';

import { Resource } from '@dxos/context';
import { type Database, type Obj, type Type } from '@dxos/echo';
import { EchoClient } from '@dxos/echo-client';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import { ServiceContainer } from '@dxos/functions-runtime-cloudflare';
import { invariant } from '@dxos/invariant';
import { EID, type PublicKey, type SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv, type SharedDocument, type SharedObject, makeInProcessClient } from '@dxos/protocols';
import { QueryResponseSchema } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { DataService, QueryService } from '@dxos/protocols/rpc';

export type ThinClientOptions = {
  spaceId: SpaceId;
  spaceKey: PublicKey;
  /** The objects the client serves, each with the document that holds it. */
  objects: readonly SharedObject[];
  /** The documents that hold `objects`, as EDGE handed them over. */
  documents: readonly SharedDocument[];
  /** The types the app knows, so objects decode with their schema. */
  types: readonly Type.AnyEntity[];
};

/**
 * A read-only ECHO client for one space, served from documents EDGE handed over rather than from a worker, for a guest
 * that has no identity, index or storage yet. It runs the data and query handlers EDGE functions run
 * ({@link ServiceContainer}), over these documents instead of EDGE's service bindings, under a space root of its own
 * that links only the given objects. A view that needs more than reading these objects needs a service added here.
 */
export class ThinClient extends Resource {
  readonly #options: ThinClientOptions;
  readonly #echoClient = new EchoClient();
  #scope: Scope.Closeable | undefined;
  #db: Database.Database | undefined;

  constructor(options: ThinClientOptions) {
    super();
    this.#options = options;
  }

  get db(): Database.Database {
    invariant(this.#db, 'Thin client is not open.');
    return this.#db;
  }

  protected override async _open(): Promise<void> {
    const { spaceId, spaceKey, objects, documents, types } = this.#options;
    const root = makeSpaceRoot(spaceId, spaceKey, objects);
    const store = new Map(documents.map(({ documentId, data }) => [documentId, fromBase64(data)]));
    store.set(root.documentId, root.data);

    const services = await new ServiceContainer(
      {},
      makeDataService(store, { spaceKey: spaceKey.toHex(), rootDocumentId: root.documentId }),
      unservedQueueService,
      unservedAiService,
    ).createServices();
    const scope = Effect.runSync(Scope.make());
    this.#scope = scope;
    const [dataService, queryService] = await EffectEx.runPromise(
      Effect.all([
        makeInProcessClient(DataService.Rpcs, services.dataService),
        makeInProcessClient(QueryService.Rpcs, services.queryService),
      ]).pipe(Effect.provideService(Scope.Scope, scope)),
    );

    this.#echoClient.graph.registry.add(types);
    this.#echoClient.connectToService({ dataService, queryService });
    await this.#echoClient.open();
    const db = this.#echoClient.constructDatabase({
      spaceId,
      spaceKey,
      reactiveSchemaQuery: false,
      preloadSchemaOnOpen: false,
    });
    await db.setSpaceRoot(root.url);
    await db.open();
    this.#db = db;
  }

  protected override async _close(): Promise<void> {
    this.#db = undefined;
    await this.#echoClient.close();
    if (this.#scope) {
      await EffectEx.runPromise(Scope.close(this.#scope, Exit.void));
      this.#scope = undefined;
    }
  }

  /** Loads one of the client's objects, or `undefined` when its document was not handed over. */
  async load(objectId: string): Promise<Obj.Unknown | undefined> {
    return this.db.makeRef<Obj.Unknown>(EID.make({ spaceId: this.#options.spaceId, entityId: objectId })).tryLoad();
  }
}

/** The space root the client opens: it links only the given objects, so nothing outside them is ever asked for. */
const makeSpaceRoot = (
  spaceId: SpaceId,
  spaceKey: PublicKey,
  objects: readonly SharedObject[],
): { url: string; documentId: string; data: Uint8Array } => {
  const url = generateAutomergeUrl();
  const doc = A.from({
    version: SpaceDocVersion.CURRENT,
    access: { spaceId, spaceKey: spaceKey.toHex() },
    links: Object.fromEntries(objects.map(({ id, documentId }) => [id, new A.RawString(`automerge:${documentId}`)])),
  } satisfies DatabaseDirectory);
  return { url, documentId: parseAutomergeUrl(url).documentId, data: A.save(doc) };
};

/**
 * EDGE's data service as EDGE functions see it, answered from `documents` instead of a service binding. Queries find
 * nothing, since there is no index; writes fail, since the guest edits through the full client once it has joined.
 */
const makeDataService = (
  documents: ReadonlyMap<string, Uint8Array>,
  meta: EdgeFunctionEnv.SpaceMeta,
): EdgeFunctionEnv.DataService => ({
  getSpaceMeta: async () => rpcResult({ ...meta }),
  getDocuments: async (_ctx, _spaceId, documentIds) =>
    rpcResult(
      documentIds.flatMap((documentId) => {
        const data = documents.get(documentId);
        return data ? [{ documentId, data }] : [];
      }),
    ),
  execQuery: async () => rpcResult(create(QueryResponseSchema, { results: [] })),
  createDocument: async () => Promise.reject(new Error(READ_ONLY)),
  changeDocument: async () => Promise.reject(new Error(READ_ONLY)),
});

const unservedQueueService: EdgeFunctionEnv.QueueService = {
  queryQueue: async () => Promise.reject(new Error(NO_FEEDS)),
  insertIntoQueue: async () => Promise.reject(new Error(NO_FEEDS)),
  deleteFromQueue: async () => Promise.reject(new Error(NO_FEEDS)),
};

const unservedAiService: EdgeFunctionEnv.FunctionsAiService = {
  fetch: async () => Promise.reject(new Error('The thin client serves no AI service.')),
};

const READ_ONLY = 'The thin client is read-only.';
const NO_FEEDS = 'The thin client serves no feeds.';

/** Adds the disposer a Workers RPC result carries, which the functions' handlers release with `using`. */
const rpcResult = <T extends object>(value: T): T & EdgeFunctionEnv.RpcDisposable =>
  Object.assign(value, { [Symbol.dispose]: () => {} });

const fromBase64 = (data: string): Uint8Array => Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
