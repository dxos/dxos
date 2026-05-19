//
// Copyright 2024 DXOS.org
//

import { type DocumentId, type DocumentQuery, interpretAsDocumentId } from '@automerge/automerge-repo';
import isEqual from 'fast-deep-equal';

import { Event, UpdateScheduler } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
// #region DEBUG
import { log } from '@dxos/log';
// #endregion DEBUG

import { DatabaseRoot } from './database-root';

export class SpaceStateManager extends Resource {
  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _rootBySpace = new Map<SpaceId, DocumentId>();
  private readonly _perRootContext = new Map<DocumentId, Context>();
  private readonly _lastSpaceDocumentList = new Map<SpaceId, DocumentId[]>();
  /**
   * Reverse index `documentId → spaceId` over every doc tracked by any space
   * (root + linked). Populated synchronously for the root during
   * {@link assignRootToSpace} and updated for linked docs each time the
   * document list scheduler fires. Used by callers (e.g.
   * `AutomergeHost._getContainingSpaceForDocument`) that need per-doc space
   * attribution at policy-check time WITHOUT waiting for Epoch credentials
   * to be processed.
   */
  private readonly _spaceByDocument = new Map<DocumentId, SpaceId>();

  public readonly spaceDocumentListUpdated = new Event<SpaceDocumentListUpdatedEvent>();

  protected override async _close(ctx: Context): Promise<void> {
    for (const [_, rootCtx] of this._perRootContext) {
      await rootCtx.dispose();
    }
    this._roots.clear();
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
   * Resolve the space that contains the given automerge document, by either
   * being its root or appearing in the space's linked document list. Returns
   * `undefined` if no space tracks the document yet.
   *
   * Cheap synchronous map lookup; safe to call from hot paths like the
   * subduction policy hooks.
   */
  findSpaceIdByDocumentId(documentId: DocumentId): SpaceId | undefined {
    return this._spaceByDocument.get(documentId);
  }

  async assignRootToSpace(spaceId: SpaceId, query: DocumentQuery<DatabaseDirectory>): Promise<DatabaseRoot> {
    let root: DatabaseRoot;
    if (this._roots.has(query.documentId)) {
      root = this._roots.get(query.documentId)!;
    } else {
      root = new DatabaseRoot(query);
      this._roots.set(query.documentId, root);
    }

    if (this._rootBySpace.get(spaceId) === root.handle.documentId) {
      return root;
    }

    const prevRootId = this._rootBySpace.get(spaceId);
    if (prevRootId) {
      void this._perRootContext.get(prevRootId)?.dispose();
      this._perRootContext.delete(prevRootId);
      // Drop the previous root's reverse-index entries. We must clear BOTH:
      //  - The cached document list (set asynchronously by the scheduler),
      //    which may not have run yet if the reassignment is fast.
      //  - The prevRootId itself, which is populated synchronously by the
      //    `this._spaceByDocument.set(root.handle.documentId, spaceId)`
      //    below on the original assignment.
      const prevDocs = this._lastSpaceDocumentList.get(spaceId);
      if (prevDocs) {
        for (const id of prevDocs) {
          if (this._spaceByDocument.get(id) === spaceId) {
            this._spaceByDocument.delete(id);
          }
        }
        this._lastSpaceDocumentList.delete(spaceId);
      }
      if (this._spaceByDocument.get(prevRootId) === spaceId) {
        this._spaceByDocument.delete(prevRootId);
      }
    }

    this._rootBySpace.set(spaceId, root.handle.documentId);
    // Eagerly attribute the root + every currently-known linked doc to the
    // space. The subduction policy looks these up during initial sync,
    // before `documentListCheckScheduler` (or any Epoch credential) has
    // fired. Production callers (`EchoHost.openSpaceRoot`) await the root
    // handle before calling here, so `root.isLoaded` is true and the links
    // are immediately readable; the scheduler below still catches links
    // that appear AFTER assignment.
    this._spaceByDocument.set(root.handle.documentId, spaceId);
    if (root.isLoaded) {
      for (const linkedUrl of root.getAllLinkedDocuments()) {
        this._spaceByDocument.set(interpretAsDocumentId(linkedUrl), spaceId);
      }
    }
    const ctx = new Context();

    this._perRootContext.set(root.handle.documentId, ctx);

    const documentListCheckScheduler = new UpdateScheduler(
      ctx,
      async () => {
        const documentIds = [root.documentId, ...root.getAllLinkedDocuments().map((url) => interpretAsDocumentId(url))];
        // #region DEBUG
        {
          const prev = this._lastSpaceDocumentList.get(spaceId) ?? [];
          const added = documentIds.filter((d) => !prev.includes(d));
          const removed = prev.filter((d) => !documentIds.includes(d));
          const changed = added.length > 0 || removed.length > 0;
          log.info('[DEBUG H3] doc list check', {
            sp: spaceId.slice(0, 8),
            prevCount: prev.length,
            newCount: documentIds.length,
            added: added.slice(0, 5),
            addedCount: added.length,
            removedCount: removed.length,
            changed,
          });
        }
        // #endregion DEBUG
        if (!isEqual(documentIds, this._lastSpaceDocumentList.get(spaceId))) {
          const prev = this._lastSpaceDocumentList.get(spaceId) ?? [];
          this._lastSpaceDocumentList.set(spaceId, documentIds);
          // Maintain the reverse index: add new docs, drop removed ones (only
          // if the removed doc is still attributed to *this* space — a doc
          // can legitimately move when a root is reassigned).
          for (const id of documentIds) {
            this._spaceByDocument.set(id, spaceId);
          }
          for (const id of prev) {
            if (!documentIds.includes(id) && this._spaceByDocument.get(id) === spaceId) {
              this._spaceByDocument.delete(id);
            }
          }
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
}

export class SpaceDocumentListUpdatedEvent {
  constructor(
    public readonly spaceId: SpaceId,
    public readonly spaceRootId: DocumentId,
    public readonly previousRootId: DocumentId | undefined,
    public readonly documentIds: DocumentId[],
  ) {}
}
