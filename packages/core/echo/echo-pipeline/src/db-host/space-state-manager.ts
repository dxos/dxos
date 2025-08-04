//
// Copyright 2024 DXOS.org
//

import { type DocHandle, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';
import isEqual from 'lodash.isequal';

import { Event, UpdateScheduler } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';

import { DatabaseRoot } from './database-root';

export class SpaceStateManager extends Resource {
  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _rootBySpace = new Map<SpaceId, DocumentId>();
  private readonly _perRootContext = new Map<DocumentId, Context>();
  private readonly _lastSpaceDocumentList = new Map<SpaceId, DocumentId[]>();

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

  async assignRootToSpace(spaceId: SpaceId, handle: DocHandle<DatabaseDirectory>): Promise<DatabaseRoot> {
    let root: DatabaseRoot;
    if (this._roots.has(handle.documentId)) {
      root = this._roots.get(handle.documentId)!;
    } else {
      root = new DatabaseRoot(handle);
      this._roots.set(handle.documentId, root);
    }

    if (this._rootBySpace.get(spaceId) === root.handle.documentId) {
      return root;
    }

    const prevRootId = this._rootBySpace.get(spaceId);
    if (prevRootId) {
      void this._perRootContext.get(prevRootId)?.dispose();
      this._perRootContext.delete(prevRootId);
    }

    this._rootBySpace.set(spaceId, root.handle.documentId);
    const ctx = new Context();

    this._perRootContext.set(root.handle.documentId, ctx);

    await root.handle.whenReady();

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
}

export class SpaceDocumentListUpdatedEvent {
  constructor(
    public readonly spaceId: SpaceId,
    public readonly spaceRootId: DocumentId,
    public readonly previousRootId: DocumentId | undefined,
    public readonly documentIds: DocumentId[],
  ) {}
}
