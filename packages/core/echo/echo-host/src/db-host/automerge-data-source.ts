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

const HEADS_DELIMITER = '|';

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

/**
 * Data source that fetches objects from AutomergeHost.
 * Iterates all documents from SqliteHeadsStore and tracks document heads as cursors to detect changes.
 */
export type AutomergeDataSourceOptions = {
  /** True for a document that must not contribute change summaries (see {@link AutomergeDataSource.#branchDocumentIds}). */
  isBranchDocument?: (documentId: DocumentId) => boolean;
};

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
      // Per document until the loop ends: a branch document may precede its root in this batch,
      // and a document whose extraction fails must not leave its changes behind to be recounted
      // when the cursor that was never written brings it back.
      const pendingActivity = new Map<DocumentId, DocumentActivity>();
      // Branch documents first seen in this batch: rows already recorded for them (from a pass that ran
      // before their root's registry was read) are discarded.
      const newBranches: DocumentActivity[] = [];
      const extractObjects = opts?.objects !== false;

      for (const { documentId, heads: docHeads } of changedDocuments) {
        try {
          using lease = yield* Effect.promise(() => this.#automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId));
          if (!lease) {
            continue;
          }
          const doc: DatabaseDirectory = lease.doc();

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

          // A space root's branch registry names every branch document the space must replicate;
          // caching membership here lets a later pass recognize the branch document itself even
          // before this data source has loaded it directly. Only the activity pass records it, or an
          // object pass reading the root first would leave nothing new for activity to discard.
          if (opts?.activity && doc.branches) {
            for (const url of DatabaseDirectory.getAllBranchDocUrls(doc)) {
              if (!isValidAutomergeUrl(url)) {
                continue;
              }
              const branchId = interpretAsDocumentId(url);
              if (!this.#branchDocumentIds.has(branchId)) {
                this.#branchDocumentIds.add(branchId);
                newBranches.push({ spaceId, documentId: branchId, full: true, changes: [] });
              }
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
            objects.push({
              spaceId,
              documentId,
              queueId: null,
              queueNamespace: null,
              queuePosition: null,
              recordId: null,
              data: objectStructureToJson(objectId, structure),
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
              // Without a cursor the summary walks the whole history, so it replaces what was recorded
              // (a document garbage-collected and replicated again would otherwise count twice).
              full: existingCursor === undefined,
              changes: changesMeta
                // A change with no clock (time 0) has no hour to land in.
                .filter((meta) => meta.time > 0)
                .map((meta) => ({ time: meta.time * 1000, ops: meta.maxOp - meta.startOp + 1 })),
            });
          }
        } catch (error) {
          log.error('Error loading document for indexing', { documentId, error });
        }
      }

      if (!opts?.activity) {
        return { objects, cursors: updatedCursors };
      }
      const activity: DocumentActivity[] = [...newBranches];
      for (const [documentId, entry] of pendingActivity) {
        const isBranch = this.#branchDocumentIds.has(documentId) || this.#isBranchDocument?.(documentId);
        // A branch document records nothing and discards anything a pass recorded before it was known.
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
 * metadata — one call serves both, since computing it twice would double the cost for the same
 * result.
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
    //
    // The change summary still wants every change the document carries, so it walks from no
    // heads at all — the intended first-sight backfill.
    const changesMeta = opts.changes ? A.getChangesMetaSince(doc, []) : [];
    return { changedObjectIds: null, updatedAt: Date.now(), changesMeta };
  }

  const oldHeads = headsCodec.decode(existingCursor);

  // The object diff is the expensive part and only an object extraction reads it.
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
