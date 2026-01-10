//
// Copyright 2026 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';

import { type Obj } from '@dxos/echo';
import { ATTR_DELETED, ATTR_KIND, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
import { type DatabaseDirectory, ObjectStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { type IndexCursor } from '@dxos/index-core';
import { type DXN, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export interface AutomergeDataSourceParams {
  /**
   * Get all document IDs for a space.
   */
  getDocumentIds: (spaceId: SpaceId) => DocumentId[];

  /**
   * Get current heads for documents.
   */
  getHeads: (documentIds: DocumentId[]) => Promise<(Heads | undefined)[]>;

  /**
   * Load a document by ID.
   */
  loadDocument: (documentId: DocumentId) => Promise<DatabaseDirectory | undefined>;
}

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
 * Convert ObjectStructure to JSON data for indexing.
 */
const objectStructureToJson = (objectId: string, structure: ObjectStructure): Obj.JSON & Record<string, any> => {
  return {
    id: objectId,
    [ATTR_TYPE]: (ObjectStructure.getTypeReference(structure)?.['/'] ?? '') as DXN.String,
    [ATTR_KIND]: ObjectStructure.getEntityKind(structure),
    [ATTR_DELETED]: ObjectStructure.isDeleted(structure),
    [ATTR_RELATION_SOURCE]: ObjectStructure.getRelationSource(structure)?.['/'] as DXN.String | undefined,
    [ATTR_RELATION_TARGET]: ObjectStructure.getRelationTarget(structure)?.['/'] as DXN.String | undefined,
    ...structure.data,
  };
};

/**
 * Data source that fetches objects from AutomergeHost.
 * Tracks document heads as cursors to detect changes.
 */
export class AutomergeDataSource implements IndexDataSource {
  readonly sourceName = 'automerge';

  readonly #params: AutomergeDataSourceParams;

  constructor(params: AutomergeDataSourceParams) {
    this.#params = params;
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

      // Get spaceId from cursors (all cursors should have the same spaceId).
      const spaceId = cursors[0]?.spaceId;
      if (!spaceId) {
        return { objects: [], cursors: [] };
      }

      // Get all document IDs for the space.
      const documentIds = this.#params.getDocumentIds(spaceId);
      if (documentIds.length === 0) {
        return { objects: [], cursors: [] };
      }

      // Get current heads for all documents.
      const heads = yield* Effect.promise(() => this.#params.getHeads(documentIds));

      // Find changed documents.
      const changedDocuments: { documentId: DocumentId; heads: Heads }[] = [];
      for (let i = 0; i < documentIds.length; i++) {
        const documentId = documentIds[i];
        const currentHeads = heads[i];
        if (!currentHeads) {
          continue; // Document not available.
        }

        const existingCursor = cursorMap.get(documentId);
        if (hasChanged(existingCursor, currentHeads)) {
          changedDocuments.push({ documentId, heads: currentHeads });
        }
      }

      // Apply limit if specified.
      const documentsToProcess = opts?.limit ? changedDocuments.slice(0, opts.limit) : changedDocuments;

      // Load changed documents and extract objects.
      const objects: IndexerObject[] = [];
      const updatedCursors: DataSourceCursor[] = [];

      for (const { documentId, heads: docHeads } of documentsToProcess) {
        try {
          const doc = yield* Effect.promise(() => this.#params.loadDocument(documentId));
          if (!doc) {
            continue;
          }

          // Skip outdated docs.
          if (doc.version !== SpaceDocVersion.CURRENT) {
            continue;
          }

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
