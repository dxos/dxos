//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import { objectStructureToJson } from '@dxos/echo/internal';
import { DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeHost } from '../automerge';
import { createIdFromSpaceKey } from '../common';

const HEADS_DELIMITER = '|';

/**
 * Codec for serializing/deserializing Automerge heads to cursor strings.
 */
export const headsCodec = {
  /**
   * Serialize automerge heads to a cursor string.
   * Heads are sorted to ensure consistent comparison.
   */
  encode: (heads: Heads): string => [...heads].sort().join(HEADS_DELIMITER),

  /**
   * Deserialize a cursor string back to heads array.
   */
  decode: (cursor: string): string[] => (cursor ? cursor.split(HEADS_DELIMITER) : []),
};

/**
 * Check if document has changed by comparing cursor with current heads.
 */
const hasChanged = (cursor: string | undefined, currentHeads: Heads): boolean => {
  if (!cursor) {
    return true; // New document.
  }
  return cursor !== headsCodec.encode(currentHeads);
};

/**
 * Data source that fetches objects from AutomergeHost.
 * Iterates all documents from HeadsStore and tracks document heads as cursors to detect changes.
 */
export class AutomergeDataSource implements IndexDataSource {
  readonly sourceName = 'automerge';

  readonly #automergeHost: AutomergeHost;

  constructor(automergeHost: AutomergeHost) {
    this.#automergeHost = automergeHost;
  }

  getChangedObjects(
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.gen(this, function* () {
      // Build a map of documentId -> cursor for quick lookup.
      const cursorMap = new Map<string, string>();
      for (const cursor of cursors) {
        if (cursor.resourceId) {
          cursorMap.set(cursor.resourceId, String(cursor.cursor));
        }
      }

      // Find changed documents by iterating all documents from HeadsStore.
      const changedDocuments = yield* Effect.promise(async () => {
        const result: { documentId: DocumentId; heads: Heads }[] = [];
        const limit = opts?.limit ?? Infinity;

        for await (const { documentId, heads } of this.#automergeHost.listDocumentHeads()) {
          const existingCursor = cursorMap.get(documentId);
          if (hasChanged(existingCursor, heads)) {
            result.push({ documentId, heads });
            if (result.length >= limit) {
              break;
            }
          }
        }
        return result;
      });

      // Load changed documents and extract objects.
      const objects: IndexerObject[] = [];
      const updatedCursors: DataSourceCursor[] = [];

      for (const { documentId, heads: docHeads } of changedDocuments) {
        try {
          const handle = yield* Effect.promise(() =>
            this.#automergeHost.loadDoc<DatabaseDirectory>(Context.default(), documentId),
          );
          const doc = handle.doc();
          if (!doc) {
            continue;
          }

          // Skip outdated docs.
          if (doc.version !== SpaceDocVersion.CURRENT) {
            continue;
          }

          // Extract spaceId from document.
          const spaceKeyHex = DatabaseDirectory.getSpaceKey(doc);
          if (!spaceKeyHex) {
            // Skip documents without a space key.
            continue;
          }
          const spaceKey = PublicKey.fromHex(spaceKeyHex);
          const spaceId = yield* Effect.promise(() => createIdFromSpaceKey(spaceKey));

          const existingCursor = cursorMap.get(documentId);
          const { changedObjectIds, updatedAt } = inspectDocChanges(doc, existingCursor);

          const docObjects = doc.objects ?? {};
          for (const [objectId, structure] of Object.entries(docObjects)) {
            if (changedObjectIds && !changedObjectIds.has(objectId)) {
              continue;
            }
            objects.push({
              spaceId,
              documentId,
              queueId: null,
              recordId: null,
              data: objectStructureToJson(objectId, structure),
              updatedAt,
            });
          }

          // Update cursor for this document.
          updatedCursors.push({
            spaceId,
            resourceId: documentId,
            cursor: headsCodec.encode(docHeads),
          });
        } catch (error) {
          log.error('Error loading document for indexing', { documentId, error });
        }
      }

      return { objects, cursors: updatedCursors };
    });
  }
}

/**
 * Determines which ECHO objects changed and the document-level max change timestamp.
 *
 * Uses `A.diff` to extract changed objectIds from patch paths (`["objects", objectId, ...]`),
 * and `A.getChangesMetaSince` for the max timestamp.
 * Returns `changedObjectIds: null` when all objects should be indexed (new document or error).
 */
const inspectDocChanges = (
  doc: DatabaseDirectory,
  existingCursor: string | undefined,
): { changedObjectIds: Set<string> | null; updatedAt: number } => {
  if (!existingCursor) {
    return { changedObjectIds: null, updatedAt: Date.now() };
  }

  const oldHeads = headsCodec.decode(existingCursor);

  const patches = A.diff(doc, oldHeads, A.getHeads(doc));
  const changedObjectIds = new Set<string>();
  for (const patch of patches) {
    if (patch.path.length >= 2 && patch.path[0] === 'objects') {
      changedObjectIds.add(String(patch.path[1]));
    }
  }

  const changes = A.getChangesMetaSince(doc, oldHeads);
  let maxTime = 0;
  for (const change of changes) {
    if (change.time > maxTime) {
      maxTime = change.time;
    }
  }
  const updatedAt = maxTime > 0 ? maxTime * 1000 : Date.now();

  return { changedObjectIds, updatedAt };
};
