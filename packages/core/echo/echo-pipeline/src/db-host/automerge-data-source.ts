//
// Copyright 2026 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import { type Obj } from '@dxos/echo';
import {
  ATTR_DELETED,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
  objectStructureToJson,
} from '@dxos/echo/internal';
import { DatabaseDirectory, ObjectStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { type IndexCursor } from '@dxos/index-core';
import { type DXN, PublicKey } from '@dxos/keys';
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
    cursors: IndexCursor[],
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

          // Extract objects from the document.
          const docObjects = doc.objects ?? {};
          for (const [objectId, structure] of Object.entries(docObjects)) {
            objects.push({
              spaceId,
              documentId,
              queueId: null,
              recordId: null,
              data: objectStructureToJson(objectId, structure),
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
