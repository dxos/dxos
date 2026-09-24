//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { type DocumentId, interpretAsDocumentId, isValidAutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';

import { type Context } from '@dxos/context';
import { DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { objectStructureToJson } from '@dxos/echo/internal';
import {
  type DataSourceCursor,
  type DocumentActivity,
  type IndexDataSource,
  type IndexerObject,
} from '@dxos/index-core';
import { log } from '@dxos/log';

import { type AutomergeHost } from '../automerge/index.ts';
import { toChangeRecord } from './change-record.ts';

const HEADS_DELIMITER = '|';

/**
 * Heads of the document when an object's snapshot was read from it, stored in the snapshot: the
 * cursor records the saved heads, which can trail the resident document the snapshot comes from.
 */
export const ATTR_HEADS = '@heads';

/**
 * The document's `access` and the object's stored fields other than `data`, exactly as stored, since
 * the JSON form reshapes or drops some of them. Absent when the object holds a value JSON cannot
 * carry, so that a reader rebuilding the document from the snapshot gets it exactly or not at all.
 */
export const ATTR_STORED = '@stored';

/** Whether a stored value survives JSON unchanged; RawString, bytes, dates and counters do not. */
const isJsonValue = (value: unknown): boolean => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return (
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every(isJsonValue)
  );
};

/**
 * Codec for serializing/deserializing Automerge heads to cursor strings.
 */
export const headsCodec = {
  /**
   * Serialize automerge heads to a cursor string.
   * Heads are sorted to ensure consistent comparison.
   */
  encode: (heads: A.Heads): string => [...heads].sort().join(HEADS_DELIMITER),

  /**
   * Deserialize a cursor string back to heads array.
   */
  decode: (cursor: string): string[] => (cursor ? cursor.split(HEADS_DELIMITER) : []),
};

/**
 * Check if document has changed by comparing cursor with current heads.
 */
const hasChanged = (cursor: string | undefined, currentHeads: A.Heads): boolean => {
  if (!cursor) {
    return true; // New document.
  }
  return cursor !== headsCodec.encode(currentHeads);
};

export type AutomergeDataSourceOptions = {
  isBranchDocument?: (documentId: DocumentId) => boolean;
};

/**
 * Data source that fetches objects from AutomergeHost.
 * Iterates all documents from SqliteHeadsStore and tracks document heads as cursors to detect changes.
 */
export class AutomergeDataSource implements IndexDataSource {
  readonly sourceName = 'automerge';

  readonly #automergeHost: AutomergeHost;
  readonly #isBranchDocument: ((documentId: DocumentId) => boolean) | undefined;

  /**
   * Heads for every document, captured once per `IndexEngine.update` pass. `listDocumentHeads()` is
   * an unbounded scan of `automerge_heads` and is cursor-independent, so re-reading it for each
   * index in a pass doubles the cost for an identical result. Held only for the pass — a document
   * saved mid-pass is still picked up next pass, since `documentsSaved` schedules one.
   */
  #passHeads: Promise<{ documentId: DocumentId; heads: A.Heads }[]> | null = null;
  #passActive = false;

  /**
   * Branch documents seen as a space root's registry, across every pass. A merge lands a branch's
   * changes in the main document under the same hashes, so counting the branch document too would
   * double-count every merged change.
   */
  readonly #branchDocumentIds = new Set<DocumentId>();

  constructor(automergeHost: AutomergeHost, options?: AutomergeDataSourceOptions) {
    this.#automergeHost = automergeHost;
    this.#isBranchDocument = options?.isBranchDocument;
  }

  beginPass(): void {
    this.#passActive = true;
    this.#passHeads = null;
  }

  endPass(): void {
    this.#passActive = false;
    this.#passHeads = null;
  }

  /** Caches the promise, not the result, so concurrent callers in one pass share a single scan. */
  #listAllDocumentHeads(): Promise<{ documentId: DocumentId; heads: A.Heads }[]> {
    if (this.#passHeads) {
      return this.#passHeads;
    }
    const scan = (async () => {
      const entries: { documentId: DocumentId; heads: A.Heads }[] = [];
      for await (const entry of this.#automergeHost.listDocumentHeads()) {
        entries.push(entry);
      }
      return entries;
    })();
    if (this.#passActive) {
      this.#passHeads = scan;
    }
    return scan;
  }

  getChangedObjects(
    ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number; activity?: boolean; objects?: boolean },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; activity?: DocumentActivity[] }> {
    return Effect.gen({ self: this }, function* () {
      // Build a map of documentId -> cursor for quick lookup.
      const cursorMap = new Map<string, string>();
      for (const cursor of cursors) {
        if (cursor.resourceId) {
          cursorMap.set(cursor.resourceId, String(cursor.cursor));
        }
      }

      // Find changed documents by diffing every document's heads against this index's cursors. The
      // scan is shared across the pass; the diff is not, since cursors are per-index.
      const allDocumentHeads = yield* Effect.promise(() => this.#listAllDocumentHeads());
      const changedDocuments: { documentId: DocumentId; heads: A.Heads }[] = [];
      const limit = opts?.limit ?? Infinity;
      for (const { documentId, heads } of allDocumentHeads) {
        if (hasChanged(cursorMap.get(documentId), heads)) {
          changedDocuments.push({ documentId, heads });
          if (changedDocuments.length >= limit) {
            break;
          }
        }
      }

      // Load changed documents and extract objects.
      const objects: IndexerObject[] = [];
      const updatedCursors: DataSourceCursor[] = [];
      const pendingActivity = new Map<DocumentId, DocumentActivity>();
      const branchDiscards = new Map<DocumentId, DocumentActivity>();
      const extractObjects = opts?.objects !== false;

      for (const { documentId, heads: docHeads } of changedDocuments) {
        try {
          using lease = yield* Effect.promise(() => this.#automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId));
          if (!lease) {
            continue;
          }
          const doc: DatabaseDirectory = lease.doc();
          const readHeads = A.getHeads(lease.doc());

          // Skip outdated docs.
          if (doc.version !== SpaceDocVersion.CURRENT) {
            continue;
          }

          // Extract spaceId from document, coalescing legacy space key fields.
          const spaceId = yield* Effect.promise(() => DatabaseDirectory.getSpaceId(doc));
          if (!spaceId) {
            // Skip documents without a space identifier.
            continue;
          }

          if (doc.branches) {
            for (const url of DatabaseDirectory.getAllBranchDocUrls(doc)) {
              if (!isValidAutomergeUrl(url)) {
                continue;
              }
              const branchId = interpretAsDocumentId(url);
              this.#branchDocumentIds.add(branchId);
              branchDiscards.set(branchId, { spaceId, documentId: branchId, full: true, changes: [] });
            }
          }

          const existingCursor = cursorMap.get(documentId);
          const { changedObjectIds, updatedAt, changesMeta } = inspectDocChanges(doc, existingCursor, {
            changes: !!opts?.activity,
            objects: extractObjects,
          });

          const docObjects = extractObjects ? (doc.objects ?? {}) : {};
          for (const [objectId, structure] of Object.entries(docObjects)) {
            if (changedObjectIds && !changedObjectIds.has(objectId)) {
              continue;
            }
            const storedCreatedAt = structure.system?.createdAt;
            const { data: _data, ...stored } = structure;
            objects.push({
              spaceId,
              documentId,
              queueId: null,
              queueNamespace: null,
              queuePosition: null,
              recordId: null,
              data: {
                ...objectStructureToJson(objectId, structure),
                [ATTR_HEADS]: readHeads,
                ...(isJsonValue(doc.access ?? null) && isJsonValue(structure)
                  ? { [ATTR_STORED]: { access: doc.access, structure: stored } }
                  : {}),
              },
              createdAt: typeof storedCreatedAt === 'number' ? storedCreatedAt : null,
              updatedAt,
            });
          }

          // Update cursor for this document.
          updatedCursors.push({
            spaceId,
            resourceId: documentId,
            cursor: headsCodec.encode(docHeads),
          });
          if (opts?.activity) {
            pendingActivity.set(documentId, {
              spaceId,
              documentId,
              full: existingCursor === undefined,
              changes: changesMeta.flatMap((meta) => {
                const change = toChangeRecord(meta);
                return change ? [{ time: change.time, ops: change.ops }] : [];
              }),
            });
          }
        } catch (error) {
          log.error('Error loading document for indexing', { documentId, error });
        }
      }

      if (!opts?.activity) {
        return { objects, cursors: updatedCursors };
      }
      const activity: DocumentActivity[] = [...branchDiscards.values()];
      for (const [documentId, entry] of pendingActivity) {
        if (branchDiscards.has(documentId)) {
          continue;
        }
        const isBranch = this.#branchDocumentIds.has(documentId) || this.#isBranchDocument?.(documentId);
        activity.push(isBranch ? { ...entry, full: true, changes: [] } : entry);
      }
      return { objects, cursors: updatedCursors, activity };
    });
  }
}

/**
 * Determines which ECHO objects changed, the document-level max change timestamp, and (when
 * `opts.changes` is set) the Automerge changes behind them.
 *
 * Uses `A.diff` to extract changed objectIds from patch paths (`["objects", objectId, ...]`),
 * and `A.getChangesMetaSince` for both the max timestamp (second-level precision) and the change
 * metadata.
 * Returns `changedObjectIds: null` when all objects should be indexed (new document).
 */
const inspectDocChanges = (
  doc: DatabaseDirectory,
  existingCursor: string | undefined,
  opts: { changes: boolean; objects: boolean },
): { changedObjectIds: Set<string> | null; updatedAt: number; changesMeta: A.ChangeMetadata[] } => {
  if (!existingCursor) {
    // On first indexing we don't have a prior cursor so we can't isolate per-object
    // change timestamps.  Fall back to the current wall-clock time so that freshly
    // indexed objects sort "recent" in `Order.updated` queries.
    const changesMeta = opts.changes ? A.getChangesMetaSince(doc, []) : [];
    return { changedObjectIds: null, updatedAt: Date.now(), changesMeta };
  }

  const oldHeads = headsCodec.decode(existingCursor);

  const changedObjectIds = new Set<string>();
  if (opts.objects) {
    for (const patch of A.diff(doc, oldHeads, A.getHeads(doc))) {
      if (patch.path.length >= 2 && patch.path[0] === 'objects') {
        changedObjectIds.add(String(patch.path[1]));
      }
    }
  }

  const changesMeta = A.getChangesMetaSince(doc, oldHeads);
  let maxTime = 0;
  for (const change of changesMeta) {
    if (change.time > maxTime) {
      maxTime = change.time;
    }
  }
  const updatedAt = maxTime > 0 ? maxTime * 1000 : Date.now();

  return { changedObjectIds, updatedAt, changesMeta };
};
