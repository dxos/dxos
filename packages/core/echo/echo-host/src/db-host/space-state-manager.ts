//
// Copyright 2024 DXOS.org
//

import {
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
} from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';
import isEqual from 'fast-deep-equal';

import { Event, UpdateScheduler } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type DocumentLease } from '../automerge/document-lease.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/space-state/index.ts';
import { DatabaseRoot } from './database-root.ts';

export type SpaceStateManagerProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
};

export class SpaceStateManager extends Resource {
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;

  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _rootBySpace = new Map<SpaceId, DocumentId>();
  /** Keyed by space, not by root document: two spaces can share one root and must tear down apart. */
  private readonly _perSpaceContext = new Map<SpaceId, Context>();
  private readonly _lastSpaceDocumentList = new Map<SpaceId, DocumentId[]>();
  private readonly _spaceRootRefs = new Map<SpaceId, SpaceRootRefs>();
  /** Local spaces by id, with the name each was opened by; their ids are indistinguishable from any other. */
  private readonly _localSpaces = new Map<SpaceId, string>();
  private readonly _localSpaceByName = new Map<string, SpaceId>();
  /** Re-runs a space's document-list check; the anchor documents enter the list only once refs exist. */
  private readonly _documentListCheck = new Map<SpaceId, () => void>();

  public readonly spaceDocumentListUpdated = new Event<SpaceDocumentListUpdatedEvent>();

  constructor({ runtime }: SpaceStateManagerProps) {
    super();
    this._runtime = runtime;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> = Migrator.make({})({
    loader: Migrator.fromRecord(MIGRATIONS),
    table: MIGRATIONS_TABLE,
  }).pipe(
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('SpaceStateManager.migrate'),
  );

  protected override async _open(ctx: Context): Promise<void> {
    log('SpaceStateManager: running migration...');
    await RuntimeProvider.runPromise(this._runtime)(this.migrate);
    log('SpaceStateManager: loading spaces...');
    await this._loadSpaces();
  }

  protected override async _close(ctx: Context): Promise<void> {
    for (const [_, spaceCtx] of this._perSpaceContext) {
      await spaceCtx.dispose();
    }
    for (const root of this._roots.values()) {
      root[Symbol.dispose]();
    }
    this._roots.clear();
    this._rootBySpace.clear();
    this._perSpaceContext.clear();
    this._lastSpaceDocumentList.clear();
    this._spaceRootRefs.clear();
    this._localSpaces.clear();
    this._localSpaceByName.clear();
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

  /** Whether a space is local: it stays on this device and nothing may announce, serve or sync it. */
  isLocalSpace(spaceId: SpaceId): boolean {
    return this._localSpaces.has(spaceId);
  }

  /** Ids of every local space this host knows. */
  get localSpaceIds(): SpaceId[] {
    return [...this._localSpaces.keys()];
  }

  /** The local space opened under `name`, if one exists. */
  getLocalSpaceId(name: string): SpaceId | undefined {
    return this._localSpaceByName.get(name);
  }

  /**
   * Records a space as local before its root is assigned, so the root is persisted as local in the same
   * write and no replicator ever sees it as an ordinary space.
   */
  markLocalSpace(spaceId: SpaceId, name: string): void {
    invariant(!this._localSpaceByName.has(name) || this._localSpaceByName.get(name) === spaceId, 'Local space name taken.');
    this._localSpaces.set(spaceId, name);
    this._localSpaceByName.set(name, spaceId);
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

  isBranchDocument(documentId: DocumentId): boolean {
    for (const root of this._roots.values()) {
      const doc = root.doc();
      if (!doc) {
        continue;
      }
      for (const url of DatabaseDirectory.getAllBranchDocUrls(doc)) {
        if (isValidAutomergeUrl(url) && interpretAsDocumentId(url) === documentId) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * References carried by the space root document, or undefined for a space that has none yet
   * (every space created before the root document existed).
   */
  getSpaceRootRefs(spaceId: SpaceId): SpaceRootRefs | undefined {
    return this._spaceRootRefs.get(spaceId);
  }

  /** The root is immutable, so this is written once per space — at creation, or when a legacy space gains one. */
  async setSpaceRootRefs(spaceId: SpaceId, refs: SpaceRootRefs): Promise<void> {
    // The refs are stored as columns on the space's row, so without one the UPDATE below matches
    // nothing and the refs would survive only in memory — lost on the next open.
    invariant(this._rootBySpace.has(spaceId), 'Space has no directory assigned.');
    await this._saveSpaceRootRefs(spaceId, refs);
    // Normalized so a caller sees the same shape here as after a reload, where SQL yields every column.
    this._spaceRootRefs.set(spaceId, {
      spaceRootDocUrl: refs.spaceRootDocUrl,
      credentialsDocUrl: refs.credentialsDocUrl,
    });
    // The list was computed before these existed, and nothing else changes to trigger a recheck.
    this._documentListCheck.get(spaceId)?.();
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
    this._spaceRootRefs.delete(spaceId);
    const localName = this._localSpaces.get(spaceId);
    if (localName !== undefined) {
      this._localSpaces.delete(spaceId);
      this._localSpaceByName.delete(localName);
    }

    const spaceCtx = this._perSpaceContext.get(spaceId);
    if (spaceCtx) {
      await spaceCtx.dispose();
      this._perSpaceContext.delete(spaceId);
    }
    // Kept while another space still reads through the same root, whose lease it shares.
    if (!this._isRootReferenced(documentId)) {
      this._roots.get(documentId)?.[Symbol.dispose]();
      this._roots.delete(documentId);
    }
  }

  /** Whether any space still reads through this root document. */
  private _isRootReferenced(documentId: DocumentId): boolean {
    for (const rootId of this._rootBySpace.values()) {
      if (rootId === documentId) {
        return true;
      }
    }
    return false;
  }

  /** Takes ownership of `lease`: the root holds it until the space is removed or the manager closes. */
  async assignRootToSpace(spaceId: SpaceId, lease: DocumentLease<DatabaseDirectory>): Promise<DatabaseRoot> {
    let root: DatabaseRoot;
    const existing = this._roots.get(lease.documentId);
    if (existing) {
      root = existing;
      // The root already holds a lease on this document, so the caller's is surplus.
      lease[Symbol.dispose]();
    } else {
      root = new DatabaseRoot(lease);
      this._roots.set(lease.documentId, root);
    }

    if (this._rootBySpace.get(spaceId) === root.documentId && this._perSpaceContext.has(spaceId)) {
      return root;
    }

    const prevRootId = this._rootBySpace.get(spaceId);
    if (prevRootId) {
      // Awaited: the context detaches the root's `change` listener, which needs the lease disposed
      // below to still be live.
      await this._perSpaceContext.get(spaceId)?.dispose();
      this._perSpaceContext.delete(spaceId);
    }

    this._rootBySpace.set(spaceId, root.documentId);

    // The replaced root is released here rather than at `removeSpace`, which only ever sees the
    // current one — its lease would otherwise keep the retired directory resident for the session.
    // A root shared with another space stays, since that space still reads through it.
    if (prevRootId && prevRootId !== root.documentId && !this._isRootReferenced(prevRootId)) {
      this._roots.get(prevRootId)?.[Symbol.dispose]();
      this._roots.delete(prevRootId);
    }

    await this._saveSpace(spaceId, root.url);

    // A space restored from storage is re-assigned the directory it was saved with, which retires nothing.
    let retiredRootId = prevRootId !== root.documentId ? prevRootId : undefined;

    const ctx = new Context();

    this._perSpaceContext.set(spaceId, ctx);

    const documentListCheckScheduler = new UpdateScheduler(
      ctx,
      async () => {
        // The space root and its credentials document hang off the space, not off the directory's
        // links, so they replicate only if named here — without them a peer (edge included) can
        // never read the credentials the space was anchored on.
        const anchorIds = Object.values(this._spaceRootRefs.get(spaceId) ?? {})
          .filter((url): url is AutomergeUrl => typeof url === 'string')
          .map((url) => interpretAsDocumentId(url));
        const documentIds = [
          root.documentId,
          ...anchorIds,
          ...root.getAllLinkedDocuments().map((url) => interpretAsDocumentId(url)),
        ];
        if (!isEqual(documentIds, this._lastSpaceDocumentList.get(spaceId))) {
          this._lastSpaceDocumentList.set(spaceId, documentIds);
          const event = new SpaceDocumentListUpdatedEvent(spaceId, root.documentId, retiredRootId, documentIds);
          // Reported once: listeners tear down the retired root's sync state, which must not repeat per list change.
          retiredRootId = undefined;
          this.spaceDocumentListUpdated.emit(event);
        }
      },
      { maxFrequency: 50 },
    );
    this._documentListCheck.set(spaceId, () => documentListCheckScheduler.trigger());
    ctx.onDispose(() => this._documentListCheck.delete(spaceId));

    const triggerCheckOnChange = () => documentListCheckScheduler.trigger();
    root.on('change', triggerCheckOnChange);
    ctx.onDispose(() => root.off('change', triggerCheckOnChange));

    documentListCheckScheduler.trigger();

    return root;
  }

  private async _loadSpaces(): Promise<void> {
    const rows = await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{
          space_id: string;
          root_doc_url: string;
          space_root_doc_url: string | null;
          credentials_doc_url: string | null;
          local_name: string | null;
        }>`SELECT space_id, root_doc_url, space_root_doc_url, credentials_doc_url, local_name FROM echo_spaces`;
      }),
    );
    for (const row of rows) {
      const spaceId = row.space_id as SpaceId;
      const rootDocUrl = row.root_doc_url as AutomergeUrl;
      const documentId = interpretAsDocumentId(rootDocUrl);
      this._rootBySpace.set(spaceId, documentId);
      if (row.local_name !== null) {
        this.markLocalSpace(spaceId, row.local_name);
      }
      if (row.space_root_doc_url) {
        this._spaceRootRefs.set(spaceId, {
          spaceRootDocUrl: row.space_root_doc_url as AutomergeUrl,
          credentialsDocUrl: (row.credentials_doc_url ?? undefined) as AutomergeUrl | undefined,
        });
      }
    }
  }

  private async _saveSpace(spaceId: SpaceId, rootDocUrl: AutomergeUrl): Promise<void> {
    const localName = this._localSpaces.get(spaceId) ?? null;
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // Upsert rather than INSERT OR REPLACE: the latter deletes the row, discarding the space-root columns.
        yield* sql`INSERT INTO echo_spaces (space_id, root_doc_url, local_name) VALUES (${spaceId}, ${rootDocUrl}, ${localName})
          ON CONFLICT(space_id) DO UPDATE SET root_doc_url = excluded.root_doc_url`;
      }),
    );
  }

  private async _saveSpaceRootRefs(spaceId: SpaceId, refs: SpaceRootRefs): Promise<void> {
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`UPDATE echo_spaces SET space_root_doc_url = ${refs.spaceRootDocUrl},
          credentials_doc_url = ${refs.credentialsDocUrl ?? null}
          WHERE space_id = ${spaceId}`;
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

/**
 * The references a space root document carries, as persisted beside the space. The directory lives in
 * `root_doc_url` and is reached through {@link SpaceStateManager.getRootBySpaceId}.
 */
export type SpaceRootRefs = {
  spaceRootDocUrl: AutomergeUrl;
  credentialsDocUrl?: AutomergeUrl;
};

export class SpaceDocumentListUpdatedEvent {
  constructor(
    public readonly spaceId: SpaceId,
    public readonly spaceRootId: DocumentId,
    /** The directory `spaceRootId` replaced; set only on the first update after the swap. */
    public readonly previousRootId: DocumentId | undefined,
    public readonly documentIds: DocumentId[],
  ) {}
}
