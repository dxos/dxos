//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { afterEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type DatabaseImpl, EchoClient } from '@dxos/echo-client';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey, SpaceId, URI } from '@dxos/keys';
import { type EdgeFunctionEnv, makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

import { ServiceContainer } from './service-container.ts';

/** Adds the `Symbol.dispose` an RPC result carries, which the handlers release with `using`. */
const disposable = <T extends object>(value: T): T & Disposable => Object.assign(value, { [Symbol.dispose]: () => {} });

/**
 * EDGE's document store for one space, in memory: it answers reads and applies writes, and pushes nothing, which is
 * what makes a function invocation's data plane pull-only.
 */
class MemoryDataService implements EdgeFunctionEnv.DataService {
  readonly #documents = new Map<string, A.Doc<any>>();
  readonly spaceKey = PublicKey.random();
  readonly rootDocumentId: string;

  constructor(readonly spaceId: SpaceId) {
    this.rootDocumentId = this.#create(
      A.from<any>({ version: 1, access: { spaceId, spaceKey: this.spaceKey.toHex() }, objects: {}, links: {} }),
    );
  }

  #create(doc: A.Doc<any>): string {
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    this.#documents.set(documentId, doc);
    return documentId;
  }

  async getSpaceMeta(): Promise<any> {
    return disposable({ spaceKey: this.spaceKey.toHex(), rootDocumentId: this.rootDocumentId });
  }

  async getDocuments(_ctx: unknown, _spaceId: SpaceId, documentIds: string[]): Promise<any> {
    return disposable(
      documentIds.flatMap((documentId) => {
        const doc = this.#documents.get(documentId);
        return doc ? [{ documentId, data: A.save(doc) }] : [];
      }),
    );
  }

  async execQuery(): Promise<any> {
    return disposable({ results: [] });
  }

  async createDocument(): Promise<any> {
    return disposable({ documentId: this.#create(A.init()) });
  }

  async changeDocument(_ctx: unknown, _spaceId: SpaceId, documentId: string, changes: Uint8Array): Promise<void> {
    const doc = this.#documents.get(documentId);
    if (!doc) {
      throw new Error(`No document ${documentId}`);
    }
    this.#documents.set(documentId, A.loadIncremental(doc, changes));
  }
}

const unusedQueueService = {} as EdgeFunctionEnv.QueueService;
const unusedAiService = {} as EdgeFunctionEnv.FunctionsAiService;

const cleanup: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) {
    await close();
  }
});

/** A database opened as a function invocation opens it: through the Cloudflare handlers, on the space root. */
const openDatabase = async (
  store: MemoryDataService,
  options: { refreshDirectoryOnMiss: boolean },
): Promise<DatabaseImpl> => {
  const container = new ServiceContainer(
    {} as EdgeFunctionEnv.TraceContext,
    store,
    unusedQueueService,
    unusedAiService,
  );
  const services = await container.createServices();
  const scope = Effect.runSync(Scope.make());
  const [dataService, queryService, feedService] = await EffectEx.runPromise(
    Effect.all([
      makeInProcessClient(DataService.Rpcs, services.dataService),
      makeInProcessClient(QueryService.Rpcs, services.queryService),
      makeInProcessClient(FeedService.Rpcs, services.queueService),
    ]).pipe(Effect.provideService(Scope.Scope, scope)),
  );
  const client = new EchoClient().connectToService({ dataService, queryService, feedService });
  await client.open();
  const db = client.constructDatabase({
    spaceId: store.spaceId,
    spaceKey: store.spaceKey,
    reactiveSchemaQuery: false,
    preloadSchemaOnOpen: false,
    refreshDirectoryOnMiss: options.refreshDirectoryOnMiss,
  });
  // As `wrapFunctionHandler` registers an operation's types.
  db.graph.registry.add([TestSchema.Expando]);
  await db.setSpaceRoot(`automerge:${store.rootDocumentId}`);
  await db.open();
  cleanup.push(async () => {
    await client.close();
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
  });
  return db;
};

/** Creates an object in its own invocation, flushed as `wrapFunctionHandler` flushes it, and returns its id. */
const createInAnotherInvocation = async (store: MemoryDataService, name: string): Promise<string> => {
  const writer = await openDatabase(store, { refreshDirectoryOnMiss: true });
  const object = writer.add(Obj.make(TestSchema.Expando, { name }));
  await writer.flush({ disk: true, indexes: false });
  return object.id;
};

describe('a database on the pull-only data plane', () => {
  test('loads an object another invocation created after it opened', { timeout: 20_000 }, async ({ expect }) => {
    const store = new MemoryDataService(SpaceId.random());
    // Opened first, as a caller is when it invokes another bundle's operation, or an agent before its tool calls.
    const reader = await openDatabase(store, { refreshDirectoryOnMiss: true });

    const id = await createInAnotherInvocation(store, 'canvas');

    const loaded = await reader.makeRef(URI.make(`echo:///${id}`)).load();
    expect((loaded as { name?: string }).name).toBe('canvas');
  });

  test('without re-reading the root the object is never found', { timeout: 20_000 }, async ({ expect }) => {
    const store = new MemoryDataService(SpaceId.random());
    const reader = await openDatabase(store, { refreshDirectoryOnMiss: false });

    const id = await createInAnotherInvocation(store, 'canvas');

    await expect(reader.makeRef(URI.make(`echo:///${id}`)).load()).rejects.toThrow();
  });

  test('an object no invocation created is still reported absent', { timeout: 20_000 }, async ({ expect }) => {
    const store = new MemoryDataService(SpaceId.random());
    const reader = await openDatabase(store, { refreshDirectoryOnMiss: true });
    await createInAnotherInvocation(store, 'unrelated');

    await expect(reader.makeRef(URI.make(`echo:///${Obj.make(TestSchema.Expando, {}).id}`)).load()).rejects.toThrow();
  });
});
