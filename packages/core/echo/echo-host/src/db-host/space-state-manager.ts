//
// Copyright 2024 DXOS.org
//

import {
  type AutomergeUrl,
  type DocumentId,
  type DocumentQuery,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';
import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import isEqual from 'fast-deep-equal';

import { Event, UpdateScheduler } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import { DatabaseRoot } from './database-root';

type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type SpaceStateManagerProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

export class SpaceStateManager extends Resource {
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;

  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _rootBySpace = new Map<SpaceId, DocumentId>();
  private readonly _perRootContext = new Map<DocumentId, Context>();
  private readonly _lastSpaceDocumentList = new Map<SpaceId, DocumentId[]>();

  public readonly spaceDocumentListUpdated = new Event<SpaceDocumentListUpdatedEvent>();

  constructor({ runtime }: SpaceStateManagerProps) {
    super();
    this._runtime = runtime;
  }

  /**
   * Creates the echo_spaces table if it does not exist.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Effect.fn(
    'SpaceStateManager.migrate',
  )(() =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE IF NOT EXISTS echo_spaces (
          space_id TEXT PRIMARY KEY,
          root_doc_url TEXT NOT NULL
        )`;
      log('echo_spaces table ready');
    }).pipe(Effect.withSpan('SpaceStateManager.migrate')),
  )();

  protected override async _open(ctx: Context): Promise<void> {
    log('SpaceStateManager: running migration...');
    await RuntimeProvider.runPromise(this._runtime)(this.migrate);
    log('SpaceStateManager: loading spaces...');
    await this._loadSpaces();
  }

  protected override async _close(ctx: Context): Promise<void> {
    for (const [_, rootCtx] of this._perRootContext) {
      await rootCtx.dispose();
    }
    this._roots.clear();
    this._rootBySpace.clear();
    this._perRootContext.clear();
    this._lastSpaceDocumentList.clear();
  }

  get roots(): ReadonlyMap<DocumentId, DatabaseRoot> {
    return this._roots;
  }

  get spaceIds(): SpaceId[] {
    return Array.from(this._rootBySpace.keys());
  }

  getRootByDocumentId(documentId: DocumentId): DatabaseRoot | undefined {
    return this._roots.get(documentId);
  }

  getSpaceRootDocumentId(spaceId: SpaceId): DocumentId | undefined {
    return this._rootBySpace.get(spaceId);
  }

  getRootBySpaceId(spaceId: SpaceId): DatabaseRoot | undefined {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const documentId = this._rootBySpace.get(spaceId);
    if (!documentId) {
      return undefined;
    }
    return this._roots.get(documentId);
  }

  /**
   * Get all persisted spaces.
   */
  getPersistedSpaces(): Array<{ spaceId: SpaceId; rootDocUrl: AutomergeUrl }> {
    const spaces: Array<{ spaceId: SpaceId; rootDocUrl: AutomergeUrl }> = [];
    for (const [spaceId, documentId] of this._rootBySpace.entries()) {
      const root = this._roots.get(documentId);
      const url = root ? root.url : (`automerge:${documentId}` as AutomergeUrl);
      spaces.push({ spaceId, rootDocUrl: url });
    }
    return spaces;
  }

  /**
   * Remove a space from the persistent store and close its resources.
   */
  async removeSpace(spaceId: SpaceId): Promise<void> {
    const documentId = this._rootBySpace.get(spaceId);
    if (!documentId) {
      return;
    }
    await this._deleteSpace(spaceId);
    this._rootBySpace.delete(spaceId);
    this._lastSpaceDocumentList.delete(spaceId);

    const rootCtx = this._perRootContext.get(documentId);
    if (rootCtx) {
      await rootCtx.dispose();
      this._perRootContext.delete(documentId);
    }
    this._roots.delete(documentId);
  }

  async assignRootToSpace(spaceId: SpaceId, query: DocumentQuery<DatabaseDirectory>): Promise<DatabaseRoot> {
    let root: DatabaseRoot;
    if (this._roots.has(query.documentId)) {
      root = this._roots.get(query.documentId)!;
    } else {
      root = new DatabaseRoot(query);
      this._roots.set(query.documentId, root);
    }

    if (this._rootBySpace.get(spaceId) === root.handle.documentId && this._perRootContext.has(root.handle.documentId)) {
      return root;
    }

    const prevRootId = this._rootBySpace.get(spaceId);
    if (prevRootId) {
      void this._perRootContext.get(prevRootId)?.dispose();
      this._perRootContext.delete(prevRootId);
    }

    this._rootBySpace.set(spaceId, root.handle.documentId);

    await this._saveSpace(spaceId, root.url);

    const ctx = new Context();

    this._perRootContext.set(root.handle.documentId, ctx);

    const documentListCheckScheduler = new UpdateScheduler(
      ctx,
      async () => {
        const documentIds = [root.documentId, ...root.getAllLinkedDocuments().map((url) => interpretAsDocumentId(url))];
        if (!isEqual(documentIds, this._lastSpaceDocumentList.get(spaceId))) {
          this._lastSpaceDocumentList.set(spaceId, documentIds);
          this.spaceDocumentListUpdated.emit(
            new SpaceDocumentListUpdatedEvent(spaceId, root.documentId, prevRootId, documentIds),
          );
        }
      },
      { maxFrequency: 50 },
    );
    const triggerCheckOnChange = () => documentListCheckScheduler.trigger();
    root.handle.addListener('change', triggerCheckOnChange);
    ctx.onDispose(() => root.handle.removeListener('change', triggerCheckOnChange));

    documentListCheckScheduler.trigger();

    return root;
  }

  private async _loadSpaces(): Promise<void> {
    const rows = await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ space_id: string; root_doc_url: string }>`SELECT space_id, root_doc_url FROM echo_spaces`;
      }),
    );
    for (const row of rows) {
      const spaceId = row.space_id as SpaceId;
      const rootDocUrl = row.root_doc_url as AutomergeUrl;
      const documentId = interpretAsDocumentId(rootDocUrl);
      this._rootBySpace.set(spaceId, documentId);
    }
  }

  private async _saveSpace(spaceId: SpaceId, rootDocUrl: AutomergeUrl): Promise<void> {
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO echo_spaces (space_id, root_doc_url) VALUES (${spaceId}, ${rootDocUrl})`;
      }),
    );
  }

  private async _deleteSpace(spaceId: SpaceId): Promise<void> {
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM echo_spaces WHERE space_id = ${spaceId}`;
      }),
    );
  }
}

export class SpaceDocumentListUpdatedEvent {
  constructor(
    public readonly spaceId: SpaceId,
    public readonly spaceRootId: DocumentId,
    public readonly previousRootId: DocumentId | undefined,
    public readonly documentIds: DocumentId[],
  ) {}
}
