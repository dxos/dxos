//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type Context } from '@dxos/context';
import { objectStructureToJson } from '@dxos/echo/internal';
import { CypherError, type FeedStore } from '@dxos/feed';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { AUTOMERGE_NAMESPACE, type DocStore, objectOfFeed } from './doc-store.ts';

/**
 * Feeds the indexer the objects whose documents gained blocks since its cursor: one cursor per space
 * over the `automerge` namespace, in insertion order, so local writes and pulled blocks index alike.
 */
export class AutomergeFeedSource implements IndexDataSource {
  readonly sourceName = 'automerge-feed';

  readonly #feedStore: FeedStore;
  readonly #docs: DocStore;
  readonly #spaceId: SpaceId;
  readonly #sql: SqlClient.SqlClient;

  constructor(options: { feedStore: FeedStore; docs: DocStore; spaceId: SpaceId; sql: SqlClient.SqlClient }) {
    this.#feedStore = options.feedStore;
    this.#docs = options.docs;
    this.#spaceId = options.spaceId;
    this.#sql = options.sql;
  }

  getChangedObjects(
    _ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number; objects?: boolean },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; more: boolean }, SqlError.SqlError> {
    // Chunks carry no per-change activity the activity index could use.
    if (opts?.objects === false) {
      return Effect.succeed({ objects: [], cursors: [], more: false });
    }
    return Effect.gen({ self: this }, function* () {
      const spaceId = this.#spaceId;
      const previous = cursors.find(
        (cursor) => cursor.spaceId === spaceId && cursor.resourceId === AUTOMERGE_NAMESPACE,
      );
      const stored =
        typeof previous?.cursor === 'string' && previous.cursor !== ''
          ? FeedProtocol.FeedCursor.make(previous.cursor)
          : undefined;
      // A cursor from another store (the file was replaced) cannot be read from; the index is derived,
      // so reading every block again is safe.
      const current =
        stored && (yield* this.#feedStore.isCursorCurrent(spaceId, stored))
          ? stored
          : FeedProtocol.encodeFeedCursor(yield* this.#feedStore.getServerToken(spaceId), FeedProtocol.FEED_START);

      const result = yield* this.#feedStore.query({
        spaceId,
        feedNamespace: AUTOMERGE_NAMESPACE,
        cursor: current,
        limit: opts?.limit,
      });

      const updatedAt = new Map<string, number>();
      const chunks = new Map<string, Uint8Array[]>();
      for (const block of result.blocks) {
        const id = block.feedId === undefined ? undefined : objectOfFeed(block.feedId);
        if (id !== undefined) {
          updatedAt.set(id, Math.max(updatedAt.get(id) ?? 0, block.timestamp));
          chunks.set(id, [...(chunks.get(id) ?? []), block.data]);
        }
      }
      // Blocks pulled from the authority or written by another process are not in a cached copy yet.
      for (const [documentId, list] of chunks) {
        this.#docs.absorb(documentId, list);
      }
      const docs = yield* this.#docs.load([...updatedAt.keys()]);
      const objects: IndexerObject[] = [];
      for (const [documentId, doc] of docs) {
        for (const [objectId, structure] of Object.entries(doc.objects ?? {})) {
          objects.push({
            spaceId,
            documentId,
            queueId: null,
            queueNamespace: null,
            queuePosition: null,
            recordId: null,
            data: objectStructureToJson(objectId, structure),
            createdAt: structure.system?.createdAt ?? null,
            // The heads the snapshot was read at: a writer edits from there, merging later changes.
            version: A.getHeads(doc),
            updatedAt: updatedAt.get(documentId) ?? Date.now(),
          });
        }
      }

      return {
        objects,
        cursors: [{ spaceId, resourceId: AUTOMERGE_NAMESPACE, cursor: result.nextCursor }],
        more: result.hasMore,
      };
    }).pipe(
      Effect.provideService(SqlClient.SqlClient, this.#sql),
      // No cypher is configured for the `automerge` namespace, so a cypher failure is a defect.
      Effect.catchIf(
        (error): error is CypherError => error instanceof CypherError,
        (error) => Effect.die(error),
      ),
    );
  }
}
